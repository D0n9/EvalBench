import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import delete

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import SessionLocal
from app.models.task import Task
from app.models.result import Result, SampleResult
from app.services.parser import parse_eval_reports

def reparse_all_tasks():
    db = SessionLocal()
    try:
        tasks = db.query(Task).filter(Task.status == "completed").all()
        print(f"Found {len(tasks)} completed tasks to re-parse.")
        
        for task in tasks:
            print(f"Processing task {task.id} ({task.name})...")
            
            # If output_dir is missing, try to find it in the workspace
            if not task.output_dir:
                print(f"Task {task.id} has no output_dir, searching in /workspace/outputs...")
                # Search for directories in /workspace/outputs
                outputs_base = "/workspace/outputs"
                if os.path.exists(outputs_base):
                    subdirs = [os.path.join(outputs_base, d) for d in os.listdir(outputs_base) if os.path.isdir(os.path.join(outputs_base, d))]
                    # Sort by modification time (most recent first)
                    subdirs.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                    
                    for sd in subdirs:
                        config_file = os.path.join(sd, "configs", "task_config.yaml")
                        if os.path.exists(config_file):
                            try:
                                import yaml
                                with open(config_file, 'r') as f:
                                    cfg = yaml.safe_load(f)
                                    # Try to match based on model and datasets
                                    if cfg.get('model_id') == task.config.get('model_id') or cfg.get('model') == task.config.get('model'):
                                        # More checks can be added here
                                        task.output_dir = sd
                                        db.commit()
                                        print(f"Found matching output_dir: {sd}")
                                        break
                            except Exception as e:
                                print(f"Error reading config {config_file}: {e}")
            
            if not task.output_dir:
                print(f"Could not find output_dir for task {task.id}, skipping.")
                continue

            # Clear existing results for this task to avoid duplicates
            results = db.query(Result).filter(Result.task_id == task.id).all()
            result_ids = [r.id for r in results]
            
            if result_ids:
                print(f"Clearing {len(result_ids)} existing results...")
                db.execute(delete(SampleResult).where(SampleResult.result_id.in_(result_ids)))
                db.execute(delete(Result).where(Result.task_id == task.id))
                db.commit()
            
            if task.task_type == "eval":
                parse_eval_reports(db, task)
            
            print(f"Finished parsing task {task.id}")
            
    except Exception as e:
        print(f"Error re-parsing tasks: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reparse_all_tasks()
