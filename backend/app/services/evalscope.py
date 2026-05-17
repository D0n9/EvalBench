import json
import os
from datetime import datetime
from app.core.celery_app import celery_app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.task import Task
from app.services.parser import parse_eval_reports
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

def sanitize_for_json(obj):
    """Recursively convert objects to JSON-serializable formats"""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    elif hasattr(obj, 'to_dict'):
        return sanitize_for_json(obj.to_dict())
    elif hasattr(obj, '__dict__'):
        return sanitize_for_json(obj.__dict__)
    elif isinstance(obj, (datetime,)):
        return obj.isoformat()
    else:
        try:
            json.dumps(obj)
            return obj
        except TypeError:
            return str(obj)

@celery_app.task(bind=True, name="app.services.evalscope.run_eval_task")
def run_eval_task(self, db_task_id: str):
    """
    Celery task that calls EvalScope engine using Python SDK.
    It blocks here, but the FastAPI main loop remains free.
    """
    from evalscope.run import run_task
    from app.models.model_config import ModelConfig
    
    db = SessionLocal()
    try:
        from app.models.dataset import Dataset as DatasetModel
        from app.models.model_config import ModelConfig
        task = db.query(Task).filter(Task.id == db_task_id).first()
        if not task:
            return {"error": "Task not found"}

        task.status = "running"
        task.celery_task_id = self.request.id
        db.commit()
        logger.info(f"Celery task started with ID: {self.request.id}, db_task_id: {db_task_id}")
        from app.services.webhook_sender import fire_event
        fire_event("task.started", task, db)
        
        config = task.config
        
        # Determine model configuration
        # Prefer model_id (PK) if present in config, otherwise use model (evalscope_model_id)
        model_id = config.get('model_id')
        evalscope_model_id = config.get('model')
        api_url = config.get('api_url')
        api_key = config.get('api_key')
        
        is_custom_model = False
        custom_api_config = None
        model_obj = None
        
        if model_id:
            model_obj = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
            if model_obj:
                evalscope_model_id = model_obj.evalscope_model_id
                api_url = model_obj.api_url
                api_key = model_obj.api_key
                if getattr(model_obj, 'api_protocol', 'openai') == 'custom':
                    is_custom_model = True
                    custom_api_config = model_obj.custom_api_config or {}
        
        # Handle custom datasets compatibility with EvalScope general templates
        raw_datasets = config.get('datasets', [])
        final_datasets = []
        dataset_args = config.get('dataset_args', {})
        
        # Remove legacy global subset_list (previously auto-filled with dataset names)
        dataset_args.pop("subset_list", None)
        
        custom_mcq_subsets = []
        custom_mcq_path = None
        custom_qa_path = None
        
        for ds_name in raw_datasets:
            ds_obj = db.query(DatasetModel).filter(DatasetModel.name == ds_name).first()
            if ds_obj and not ds_obj.is_builtin:
                tags = ds_obj.tags or []
                file_path = ds_obj.file_path
                
                if not file_path or not os.path.exists(file_path):
                    continue
                
                ds_dir = os.path.dirname(file_path)
                filename = os.path.basename(file_path)
                base, ext = os.path.splitext(filename)
                
                eval_split = "test"
                if base.endswith("_val"):
                    subset_name = base[:-4]
                    eval_split = "val"
                elif base.endswith("_dev"):
                    subset_name = base[:-4]
                    eval_split = "dev"
                elif base.endswith("_test"):
                    subset_name = base[:-5]
                    eval_split = "test"
                else:
                    subset_name = base
                
                if "MCQ" in tags:
                    if "general_mcq" not in final_datasets:
                        final_datasets.append("general_mcq")
                    custom_mcq_subsets.append(subset_name)
                    custom_mcq_path = ds_dir
                    
                    if "general_mcq" not in dataset_args:
                        dataset_args["general_mcq"] = {}
                    dataset_args["general_mcq"]["eval_split"] = eval_split
                elif "QA" in tags:
                    if "general_qa" not in final_datasets:
                        final_datasets.append("general_qa")
                    custom_qa_path = ds_dir
                    if "general_qa" not in dataset_args:
                        dataset_args["general_qa"] = {}
                    if "subset_list" not in dataset_args["general_qa"]:
                        dataset_args["general_qa"]["subset_list"] = []
                    if subset_name not in dataset_args["general_qa"]["subset_list"]:
                        dataset_args["general_qa"]["subset_list"].append(subset_name)
                    
                    dataset_args["general_qa"]["eval_split"] = eval_split
                else:
                    final_datasets.append(ds_name)
            else:
                final_datasets.append(ds_name)
        
        if custom_mcq_subsets:
            if "general_mcq" not in dataset_args:
                dataset_args["general_mcq"] = {}
            dataset_args["general_mcq"]["local_path"] = custom_mcq_path
            dataset_args["general_mcq"]["subset_list"] = custom_mcq_subsets
            
        if custom_qa_path:
            if "general_qa" not in dataset_args:
                dataset_args["general_qa"] = {}
            dataset_args["general_qa"]["local_path"] = custom_qa_path
        
        task_cfg = {
            'model': evalscope_model_id,
            'datasets': final_datasets,
            'limit': config.get('limit', None),
            'repeats': config.get('repeats', 1),
            'dataset_hub': config.get('dataset_hub', 'modelscope'),
        }
        
        # Eval settings — custom API models use the custom_api adapter
        if is_custom_model:
            from app.services.custom_model_adapter import CustomHttpModelAPI  # noqa: F811 — triggers @register_model_api
            task_cfg['eval_type'] = 'custom_api'
            task_cfg['model_args'] = {
                'custom_api_config': custom_api_config,
            }
            if api_url:
                task_cfg['api_url'] = api_url
            if api_key and api_key != "EMPTY":
                task_cfg['api_key'] = api_key
            logger.info(f"Task {db_task_id}: using custom_api adapter")
        elif config.get('eval_type') and config.get('eval_type') != 'auto':
            task_cfg['eval_type'] = config.get('eval_type')
            if api_url:
                task_cfg['api_url'] = api_url
                if api_key and api_key != "EMPTY":
                    task_cfg['api_key'] = api_key
        elif api_url:
            task_cfg['eval_type'] = 'openai_api'
            task_cfg['api_url'] = api_url
            if api_key and api_key != "EMPTY":
                task_cfg['api_key'] = api_key
            
        if config.get('eval_backend') and config.get('eval_backend') != 'Native':
            task_cfg['eval_backend'] = config.get('eval_backend')
            
        if config.get('eval_batch_size'):
            task_cfg['eval_batch_size'] = config.get('eval_batch_size')
            
        if config.get('eval_config'):
            task_cfg['eval_config'] = config.get('eval_config')
        
        generation_config = config.get('generation_config')
        if generation_config:
            # Filter out None values
            filtered_gen_cfg = {k: v for k, v in generation_config.items() if v is not None}
            if filtered_gen_cfg:
                task_cfg['generation_config'] = filtered_gen_cfg
        
        if dataset_args:
            # Filter out None values
            filtered_ds_args = {k: v for k, v in dataset_args.items() if v is not None}
            if filtered_ds_args:
                task_cfg['dataset_args'] = filtered_ds_args
        
        # Handle Judge Model (Frontend now sends judge_model dict)
        judge_model = config.get('judge_model')
        if judge_model:
            # Ensure judge_model is a dict and has model_id
            if isinstance(judge_model, dict) and judge_model.get('model_id'):
                # Extract judge parameters. In EvalScope 1.5.1, most judge-related fields 
                # should be inside judge_model_args, while judge_strategy and analysis_report are top-level.
                task_cfg['judge_strategy'] = config.get('judge_strategy', 'auto')
                task_cfg['analysis_report'] = config.get('analysis_report', False)
                
                # Handle judge_model_args (must be a dict)
                model_args = judge_model.get('model_args', {})
                if isinstance(model_args, str) and model_args.strip():
                    try:
                        model_args = json.loads(model_args)
                    except:
                        model_args = {}
                
                # Set judge model ID inside model_args
                model_args['model_id'] = judge_model.get('model_id')
                
                # Fetch API details from database if model_config_id is provided
                model_config_id = judge_model.get('model_config_id')
                db_api_url = None
                db_api_key = None
                if model_config_id:
                    judge_model_obj = db.query(ModelConfig).filter(ModelConfig.id == model_config_id).first()
                    if judge_model_obj:
                        model_args['model_id'] = judge_model_obj.evalscope_model_id
                        db_api_url = judge_model_obj.api_url
                        db_api_key = judge_model_obj.api_key
                
                # Merge API details into model_args (Prefer manual input over DB)
                final_api_url = judge_model.get('api_url') or db_api_url
                final_api_key = judge_model.get('api_key') or db_api_key
                
                if final_api_url:
                    model_args['api_url'] = final_api_url.strip(' `')
                if final_api_key and final_api_key != "EMPTY":
                    model_args['api_key'] = final_api_key
                
                # Handle other judge fields inside model_args
                if judge_model.get('system_prompt'):
                    model_args['system_prompt'] = judge_model.get('system_prompt')
                if judge_model.get('prompt_template'):
                    model_args['prompt_template'] = judge_model.get('prompt_template')
                if judge_model.get('score_type'):
                    model_args['score_type'] = judge_model.get('score_type')
                if judge_model.get('score_pattern'):
                    model_args['score_pattern'] = judge_model.get('score_pattern')
                if judge_model.get('score_mapping'):
                    model_args['score_mapping'] = judge_model.get('score_mapping')
                gen_cfg = judge_model.get('generation_config')
                if gen_cfg and isinstance(gen_cfg, dict):
                    filtered_gen = {k: v for k, v in gen_cfg.items() if v is not None}
                    if filtered_gen:
                        model_args['generation_config'] = filtered_gen
                
                task_cfg['judge_model_args'] = model_args
        
        # Sanitize API URL
        if 'api_url' in task_cfg and isinstance(task_cfg['api_url'], str):
            task_cfg['api_url'] = task_cfg['api_url'].strip(' `')
            
        # Set explicit work_dir based on task_id to avoid timestamp guessing
        base_work_dir = settings.EVALSCOPE_OUTPUT_DIR
        task_specific_dir = os.path.join(base_work_dir, db_task_id)
        task_cfg['work_dir'] = task_specific_dir
        task_cfg['no_timestamp'] = True
        
        for key in ['use_cache', 'rerun_review', 'enable_progress_tracker', 'debug', 'ignore_errors', 'dry_run']:
            if config.get(key):
                task_cfg[key] = config.get(key)
        
        logger.info(f"EvalScope run_task starting, task_id={db_task_id}")
        result = run_task(task_cfg=task_cfg)
        
        logger.info(f"EvalScope run_task result type: {type(result)}")
        logger.info(f"EvalScope run_task result: {result}")
        
        sanitized_result = sanitize_for_json(result)
        
        task.status = "completed"
        
        # Extract output_dir from result
        # result can be a dict or a list of dicts
        output_dir = None
        if isinstance(result, dict):
            output_dir = result.get("output_dir")
        elif isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict):
            output_dir = result[0].get("output_dir")
            
        if output_dir:
            task.output_dir = output_dir
            logger.info(f"Task {db_task_id} output_dir extracted from result: {task.output_dir}")
        else:
            task.output_dir = task_specific_dir
            logger.info(f"Task {db_task_id} output_dir set to task_specific_dir: {task.output_dir}")
        
        # Trigger parsing results to DB
        try:
            parse_eval_reports(db, task)
        except Exception as parse_error:
            logger.error(f"Failed to parse results for task {db_task_id}: {parse_error}", exc_info=True)
            
        db.commit()
        
        # Inject the final inferred or extracted output_dir back into the sanitized_result dict
        if isinstance(sanitized_result, dict):
            sanitized_result["output_dir"] = task.output_dir
        elif isinstance(sanitized_result, list) and len(sanitized_result) > 0 and isinstance(sanitized_result[0], dict):
            sanitized_result[0]["output_dir"] = task.output_dir

        from app.services.webhook_sender import fire_event
        fire_event("task.completed", task, db)
        
        return {"status": "success", "output_dir": task.output_dir, "result": sanitized_result}

    except Exception as e:
        error_msg = f"EvalScope Error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        if 'task' in locals() and task:
            task.status = "failed"
            db.commit()
            from app.services.webhook_sender import fire_event
            fire_event("task.failed", task, db)
        
        return {"error": error_msg}
    finally:
        db.close()
