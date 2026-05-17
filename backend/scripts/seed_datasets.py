import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.dataset import Dataset, DatasetCategory


BUILTIN_DATASETS = [
    {
        "name": "a_okvqa",
        "standard_name": "A-Okvqa",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/a_okvqa.html"
    },
    {
        "name": "aa_lcr",
        "standard_name": "AA-LCR",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "LongContext", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/aa_lcr.html"
    },
    {
        "name": "ai2d",
        "standard_name": "Ai2d",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ai2d.html"
    },
    {
        "name": "aime24",
        "standard_name": "AIME-2024",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/aime24.html"
    },
    {
        "name": "aime25",
        "standard_name": "AIME-2025",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/aime25.html"
    },
    {
        "name": "aime26",
        "standard_name": "AIME-2026",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/aime26.html"
    },
    {
        "name": "alpaca_eval",
        "standard_name": "AlpacaEval2.0",
        "category": DatasetCategory.LLM,
        "tags": ["Arena", "InstructionFollowing"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/alpaca_eval.html"
    },
    {
        "name": "amc",
        "standard_name": "AMC",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/amc.html"
    },
    {
        "name": "anat_em",
        "standard_name": "AnatEM",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/anat_em.html"
    },
    {
        "name": "arc",
        "standard_name": "ARC",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/arc.html"
    },
    {
        "name": "arena_hard",
        "standard_name": "ArenaHard",
        "category": DatasetCategory.LLM,
        "tags": ["Arena", "InstructionFollowing"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/arena_hard.html"
    },
    {
        "name": "bbh",
        "standard_name": "BBH",
        "category": DatasetCategory.LLM,
        "tags": ["Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/bbh.html"
    },
    {
        "name": "bc2gm",
        "standard_name": "BC2GM",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/bc2gm.html"
    },
    {
        "name": "bc4chemd",
        "standard_name": "BC4CHEMD",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/bc4chemd.html"
    },
    {
        "name": "bc5cdr",
        "standard_name": "BC5CDR",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/bc5cdr.html"
    },
    {
        "name": "bfcl_v3",
        "standard_name": "Bfcl-V3",
        "category": DatasetCategory.AGENT,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/bfcl_v3.html"
    },
    {
        "name": "bfcl_v4",
        "standard_name": "Bfcl-V4",
        "category": DatasetCategory.AGENT,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/bfcl_v4.html"
    },
    {
        "name": "biomix_qa",
        "standard_name": "BioMixQA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ", "Medical"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/biomix_qa.html"
    },
    {
        "name": "blink",
        "standard_name": "Blink",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/blink.html"
    },
    {
        "name": "broad_twitter_corpus",
        "standard_name": "BroadTwitterCorpus",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/broad_twitter_corpus.html"
    },
    {
        "name": "cc_bench",
        "standard_name": "Cc-Bench",
        "category": DatasetCategory.LLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/cc_bench.html"
    },
    {
        "name": "ceval",
        "standard_name": "C-Eval",
        "category": DatasetCategory.LLM,
        "tags": ["Chinese", "Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ceval.html"
    },
    {
        "name": "chartqa",
        "standard_name": "Chartqa",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/chartqa.html"
    },
    {
        "name": "chinese_simpleqa",
        "standard_name": "Chinese-SimpleQA",
        "category": DatasetCategory.LLM,
        "tags": ["Chinese", "Knowledge", "QA"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/chinese_simpleqa.html"
    },
    {
        "name": "cl_bench",
        "standard_name": "CL-bench",
        "category": DatasetCategory.LLM,
        "tags": ["InstructionFollowing", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/cl_bench.html"
    },
    {
        "name": "cmmlu",
        "standard_name": "C-MMLU",
        "category": DatasetCategory.LLM,
        "tags": ["Chinese", "Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/cmmlu.html"
    },
    {
        "name": "cmmmu",
        "standard_name": "Cmmmu",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/cmmmu.html"
    },
    {
        "name": "cmmu",
        "standard_name": "Cmmu",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/cmmu.html"
    },
    {
        "name": "coin_flip",
        "standard_name": "CoinFlip",
        "category": DatasetCategory.LLM,
        "tags": ["Reasoning", "Yes/No"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/coin_flip.html"
    },
    {
        "name": "commonsense_qa",
        "standard_name": "CommonsenseQA",
        "category": DatasetCategory.LLM,
        "tags": ["Commonsense", "MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/commonsense_qa.html"
    },
    {
        "name": "competition_math",
        "standard_name": "Competition-MATH",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/competition_math.html"
    },
    {
        "name": "conll2003",
        "standard_name": "CoNLL2003",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/conll2003.html"
    },
    {
        "name": "conllpp",
        "standard_name": "CoNLL++",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/conllpp.html"
    },
    {
        "name": "copious",
        "standard_name": "Copious",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/copious.html"
    },
    {
        "name": "cross_ner",
        "standard_name": "CrossNER",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/cross_ner.html"
    },
    {
        "name": "data_collection",
        "standard_name": "Data-Collection",
        "category": DatasetCategory.OTHER,
        "tags": ["Custom"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/data_collection.html"
    },
    {
        "name": "docmath",
        "standard_name": "DocMath",
        "category": DatasetCategory.LLM,
        "tags": ["LongContext", "Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/docmath.html"
    },
    {
        "name": "docvqa",
        "standard_name": "Docvqa",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/docvqa.html"
    },
    {
        "name": "drivel_binary",
        "standard_name": "DrivelologyBinaryClassification",
        "category": DatasetCategory.LLM,
        "tags": ["Yes/No"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/drivel_binary.html"
    },
    {
        "name": "drivel_multilabel",
        "standard_name": "DrivelologyMultilabelClassification",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/drivel_multilabel.html"
    },
    {
        "name": "drivel_selection",
        "standard_name": "DrivelologyNarrativeSelection",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/drivel_selection.html"
    },
    {
        "name": "drivel_writing",
        "standard_name": "DrivelologyNarrativeWriting",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/drivel_writing.html"
    },
    {
        "name": "drop",
        "standard_name": "DROP",
        "category": DatasetCategory.LLM,
        "tags": ["Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/drop.html"
    },
    {
        "name": "eq_bench",
        "standard_name": "EQ-Bench",
        "category": DatasetCategory.LLM,
        "tags": ["InstructionFollowing"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/eq_bench.html"
    },
    {
        "name": "evalmuse",
        "standard_name": "Evalmuse",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/evalmuse.html"
    },
    {
        "name": "fin_ner",
        "standard_name": "FinNER",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/fin_ner.html"
    },
    {
        "name": "fleurs",
        "standard_name": "Fleurs",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/fleurs.html"
    },
    {
        "name": "frames",
        "standard_name": "FRAMES",
        "category": DatasetCategory.LLM,
        "tags": ["LongContext", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/frames.html"
    },
    {
        "name": "gedit",
        "standard_name": "Gedit",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/gedit.html"
    },
    {
        "name": "genai_bench",
        "standard_name": "Genai-Bench",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/genai_bench.html"
    },
    {
        "name": "general_arena",
        "standard_name": "GeneralArena",
        "category": DatasetCategory.LLM,
        "tags": ["Arena", "Custom"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/general_arena.html"
    },
    {
        "name": "general_fc",
        "standard_name": "General-Fc",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/general_fc.html"
    },
    {
        "name": "general_mcq",
        "standard_name": "General-MCQ",
        "category": DatasetCategory.LLM,
        "tags": ["Custom", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/general_mcq.html"
    },
    {
        "name": "general_qa",
        "standard_name": "General-QA",
        "category": DatasetCategory.LLM,
        "tags": ["Custom", "QA"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/general_qa.html"
    },
    {
        "name": "general_t2i",
        "standard_name": "General-T2i",
        "category": DatasetCategory.AIGC,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/general_t2i.html"
    },
    {
        "name": "general_vmcq",
        "standard_name": "General-Vmcq",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/general_vmcq.html"
    },
    {
        "name": "general_vqa",
        "standard_name": "General-Vqa",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/general_vqa.html"
    },
    {
        "name": "genia_ner",
        "standard_name": "GeniaNER",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/genia_ner.html"
    },
    {
        "name": "gpqa_diamond",
        "standard_name": "GPQA-Diamond",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/gpqa_diamond.html"
    },
    {
        "name": "gsm8k",
        "standard_name": "GSM8K",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/gsm8k.html"
    },
    {
        "name": "gsm8k_v",
        "standard_name": "Gsm8k-V",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/gsm8k_v.html"
    },
    {
        "name": "hallusion_bench",
        "standard_name": "Hallusion-Bench",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/hallusion_bench.html"
    },
    {
        "name": "halueval",
        "standard_name": "HaluEval",
        "category": DatasetCategory.LLM,
        "tags": ["Hallucination", "Knowledge", "Yes/No"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/halueval.html"
    },
    {
        "name": "harvey_ner",
        "standard_name": "HarveyNER",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/harvey_ner.html"
    },
    {
        "name": "health_bench",
        "standard_name": "HealthBench",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "Medical", "QA"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/health_bench.html"
    },
    {
        "name": "hellaswag",
        "standard_name": "HellaSwag",
        "category": DatasetCategory.LLM,
        "tags": ["Commonsense", "Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/hellaswag.html"
    },
    {
        "name": "hle",
        "standard_name": "Humanity's-Last-Exam",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "QA"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/hle.html"
    },
    {
        "name": "hmmt25",
        "standard_name": "HMMT25",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/hmmt25.html"
    },
    {
        "name": "hpdv2",
        "standard_name": "Hpdv2",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/hpdv2.html"
    },
    {
        "name": "humaneval",
        "standard_name": "HumanEval",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/humaneval.html"
    },
    {
        "name": "humaneval_plus",
        "standard_name": "HumanEvalPlus",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/humaneval_plus.html"
    },
    {
        "name": "ifbench",
        "standard_name": "IFBench",
        "category": DatasetCategory.LLM,
        "tags": ["InstructionFollowing"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ifbench.html"
    },
    {
        "name": "ifeval",
        "standard_name": "IFEval",
        "category": DatasetCategory.LLM,
        "tags": ["InstructionFollowing"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ifeval.html"
    },
    {
        "name": "infovqa",
        "standard_name": "Infovqa",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/infovqa.html"
    },
    {
        "name": "iquiz",
        "standard_name": "IQuiz",
        "category": DatasetCategory.LLM,
        "tags": ["Chinese", "Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/iquiz.html"
    },
    {
        "name": "jnlpba",
        "standard_name": "JNLPBA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/jnlpba.html"
    },
    {
        "name": "jnlpba_rare",
        "standard_name": "JNLPBA-Rare",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/jnlpba_rare.html"
    },
    {
        "name": "librispeech",
        "standard_name": "Librispeech",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/librispeech.html"
    },
    {
        "name": "live_code_bench",
        "standard_name": "Live-Code-Bench",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/live_code_bench.html"
    },
    {
        "name": "logi_qa",
        "standard_name": "LogiQA",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/logi_qa.html"
    },
    {
        "name": "longbench_v2",
        "standard_name": "LongBench-v2",
        "category": DatasetCategory.LLM,
        "tags": ["LongContext", "MCQ", "ReadingComprehension"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/longbench_v2.html"
    },
    {
        "name": "maritime_bench",
        "standard_name": "MaritimeBench",
        "category": DatasetCategory.LLM,
        "tags": ["Chinese", "Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/maritime_bench.html"
    },
    {
        "name": "math_500",
        "standard_name": "MATH-500",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/math_500.html"
    },
    {
        "name": "math_qa",
        "standard_name": "MathQA",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ", "Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/math_qa.html"
    },
    {
        "name": "math_verse",
        "standard_name": "Math-Verse",
        "category": DatasetCategory.LLM,
        "tags": ["Math"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/math_verse.html"
    },
    {
        "name": "math_vision",
        "standard_name": "Math-Vision",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/math_vision.html"
    },
    {
        "name": "math_vista",
        "standard_name": "Math-Vista",
        "category": DatasetCategory.VLM,
        "tags": ["Math"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/math_vista.html"
    },
    {
        "name": "mbpp",
        "standard_name": "MBPP",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mbpp.html"
    },
    {
        "name": "mbpp_plus",
        "standard_name": "MBPP-Plus",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mbpp_plus.html"
    },
    {
        "name": "med_mcqa",
        "standard_name": "Med-MCQA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/med_mcqa.html"
    },
    {
        "name": "mgsm",
        "standard_name": "MGSM",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "MultiLingual", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mgsm.html"
    },
    {
        "name": "micro_vqa",
        "standard_name": "Micro-Vqa",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/micro_vqa.html"
    },
    {
        "name": "minerva_math",
        "standard_name": "Minerva-Math",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/minerva_math.html"
    },
    {
        "name": "mit_movie_trivia",
        "standard_name": "MIT-Movie-Trivia",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mit_movie_trivia.html"
    },
    {
        "name": "mit_restaurant",
        "standard_name": "MIT-Restaurant",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mit_restaurant.html"
    },
    {
        "name": "mm_bench",
        "standard_name": "Mm-Bench",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mm_bench.html"
    },
    {
        "name": "mm_star",
        "standard_name": "Mm-Star",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mm_star.html"
    },
    {
        "name": "mmlu",
        "standard_name": "MMLU",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mmlu.html"
    },
    {
        "name": "mmlu_pro",
        "standard_name": "MMLU-Pro",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mmlu_pro.html"
    },
    {
        "name": "mmlu_redux",
        "standard_name": "MMLU-Redux",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mmlu_redux.html"
    },
    {
        "name": "mmmlu",
        "standard_name": "MMMLU",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ", "MultiLingual"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mmmlu.html"
    },
    {
        "name": "mmmu",
        "standard_name": "Mmmu",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mmmu.html"
    },
    {
        "name": "mmmu_pro",
        "standard_name": "Mmmu-Pro",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mmmu_pro.html"
    },
    {
        "name": "mri_mcqa",
        "standard_name": "MRI-MCQA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ", "Medical"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/mri_mcqa.html"
    },
    {
        "name": "multi_if",
        "standard_name": "Multi-IF",
        "category": DatasetCategory.AGENT,
        "tags": ["InstructionFollowing", "MultiLingual", "MultiTurn"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/multi_if.html"
    },
    {
        "name": "multi_nerd",
        "standard_name": "MultiNERD",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/multi_nerd.html"
    },
    {
        "name": "multiple_humaneval",
        "standard_name": "MultiPL-E HumanEval",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/multiple_humaneval.html"
    },
    {
        "name": "multiple_mbpp",
        "standard_name": "MultiPL-E MBPP",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/multiple_mbpp.html"
    },
    {
        "name": "music_trivia",
        "standard_name": "MusicTrivia",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/music_trivia.html"
    },
    {
        "name": "musr",
        "standard_name": "MuSR",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/musr.html"
    },
    {
        "name": "ncbi",
        "standard_name": "NCBI",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ncbi.html"
    },
    {
        "name": "needle_haystack",
        "standard_name": "Needle-in-a-Haystack",
        "category": DatasetCategory.LLM,
        "tags": ["LongContext", "Retrieval"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/needle_haystack.html"
    },
    {
        "name": "ocr_bench",
        "standard_name": "Ocr-Bench",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ocr_bench.html"
    },
    {
        "name": "ocr_bench_v2",
        "standard_name": "Ocr-Bench-V2",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ocr_bench_v2.html"
    },
    {
        "name": "olympiad_bench",
        "standard_name": "Olympiad-Bench",
        "category": DatasetCategory.LLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/olympiad_bench.html"
    },
    {
        "name": "omni_bench",
        "standard_name": "Omni-Bench",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/omni_bench.html"
    },
    {
        "name": "omni_doc_bench",
        "standard_name": "Omni-Doc-Bench",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/omni_doc_bench.html"
    },
    {
        "name": "ontonotes5",
        "standard_name": "OntoNotes5",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/ontonotes5.html"
    },
    {
        "name": "openai_mrcr",
        "standard_name": "OpenAI MRCR",
        "category": DatasetCategory.LLM,
        "tags": ["LongContext", "Retrieval"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/openai_mrcr.html"
    },
    {
        "name": "piqa",
        "standard_name": "PIQA",
        "category": DatasetCategory.LLM,
        "tags": ["Commonsense", "MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/piqa.html"
    },
    {
        "name": "poly_math",
        "standard_name": "PolyMath",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "MultiLingual", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/poly_math.html"
    },
    {
        "name": "pope",
        "standard_name": "Pope",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/pope.html"
    },
    {
        "name": "process_bench",
        "standard_name": "ProcessBench",
        "category": DatasetCategory.LLM,
        "tags": ["Math", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/process_bench.html"
    },
    {
        "name": "pubmedqa",
        "standard_name": "PubMedQA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "Yes/No"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/pubmedqa.html"
    },
    {
        "name": "qasc",
        "standard_name": "QASC",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/qasc.html"
    },
    {
        "name": "race",
        "standard_name": "RACE",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/race.html"
    },
    {
        "name": "real_world_qa",
        "standard_name": "Real-World-Qa",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/real_world_qa.html"
    },
    {
        "name": "refcoco",
        "standard_name": "RefCOCO",
        "category": DatasetCategory.VLM,
        "tags": ["Grounding", "ImageCaptioning", "Knowledge", "MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/refcoco.html"
    },
    {
        "name": "scicode",
        "standard_name": "SciCode",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/scicode.html"
    },
    {
        "name": "science_qa",
        "standard_name": "Science-Qa",
        "category": DatasetCategory.LLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/science_qa.html"
    },
    {
        "name": "sciq",
        "standard_name": "SciQ",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ", "ReadingComprehension"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/sciq.html"
    },
    {
        "name": "seed_bench_2_plus",
        "standard_name": "Seed-Bench-2-Plus",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/seed_bench_2_plus.html"
    },
    {
        "name": "simple_qa",
        "standard_name": "SimpleQA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "QA"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/simple_qa.html"
    },
    {
        "name": "simple_vqa",
        "standard_name": "Simple-Vqa",
        "category": DatasetCategory.VLM,
        "tags": ["MultiModal"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/simple_vqa.html"
    },
    {
        "name": "siqa",
        "standard_name": "SIQA",
        "category": DatasetCategory.LLM,
        "tags": ["Commonsense", "MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/siqa.html"
    },
    {
        "name": "super_gpqa",
        "standard_name": "SuperGPQA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "MCQ"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/super_gpqa.html"
    },
    {
        "name": "swe_bench_lite",
        "standard_name": "SWE-bench_Lite",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/swe_bench_lite.html"
    },
    {
        "name": "swe_bench_verified",
        "standard_name": "SWE-bench_Verified",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/swe_bench_verified.html"
    },
    {
        "name": "swe_bench_verified_mini",
        "standard_name": "SWE-bench_Verified_mini",
        "category": DatasetCategory.LLM,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/swe_bench_verified_mini.html"
    },
    {
        "name": "tau2_bench",
        "standard_name": "Tau2-Bench",
        "category": DatasetCategory.AGENT,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/tau2_bench.html"
    },
    {
        "name": "tau_bench",
        "standard_name": "Tau-Bench",
        "category": DatasetCategory.AGENT,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/tau_bench.html"
    },
    {
        "name": "terminal_bench_v2",
        "standard_name": "Terminal-Bench-2.0",
        "category": DatasetCategory.AGENT,
        "tags": ["Coding"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/terminal_bench_v2.html"
    },
    {
        "name": "tifa160",
        "standard_name": "Tifa160",
        "category": DatasetCategory.AIGC,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/tifa160.html"
    },
    {
        "name": "tool_bench",
        "standard_name": "Tool-Bench",
        "category": DatasetCategory.AGENT,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/tool_bench.html"
    },
    {
        "name": "torgo",
        "standard_name": "Torgo",
        "category": DatasetCategory.OTHER,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/torgo.html"
    },
    {
        "name": "trivia_qa",
        "standard_name": "TriviaQA",
        "category": DatasetCategory.LLM,
        "tags": ["QA", "ReadingComprehension"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/trivia_qa.html"
    },
    {
        "name": "truthful_qa",
        "standard_name": "TruthfulQA",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/truthful_qa.html"
    },
    {
        "name": "tweebank_ner",
        "standard_name": "TweeBankNER",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/tweebank_ner.html"
    },
    {
        "name": "tweet_ner_7",
        "standard_name": "TweetNER7",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/tweet_ner_7.html"
    },
    {
        "name": "visulogic",
        "standard_name": "Visulogic",
        "category": DatasetCategory.LLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/visulogic.html"
    },
    {
        "name": "vstar_bench",
        "standard_name": "Vstar-Bench",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/vstar_bench.html"
    },
    {
        "name": "winogrande",
        "standard_name": "Winogrande",
        "category": DatasetCategory.LLM,
        "tags": ["MCQ", "Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/winogrande.html"
    },
    {
        "name": "wmt24pp",
        "standard_name": "WMT2024++",
        "category": DatasetCategory.LLM,
        "tags": ["MachineTranslation", "MultiLingual"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/wmt24pp.html"
    },
    {
        "name": "wnut2017",
        "standard_name": "WNUT2017",
        "category": DatasetCategory.LLM,
        "tags": ["Knowledge", "NER"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/wnut2017.html"
    },
    {
        "name": "zebralogicbench",
        "standard_name": "ZebraLogicBench",
        "category": DatasetCategory.LLM,
        "tags": ["Reasoning"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/zebralogicbench.html"
    },
    {
        "name": "zerobench",
        "standard_name": "Zerobench",
        "category": DatasetCategory.VLM,
        "tags": ["Other"],
        "link": "https://evalscope.readthedocs.io/zh-cn/latest/benchmarks/zerobench.html"
    },
]


DATASET_SUBSETS = {
    "aime25": ["AIME2025-I", "AIME2025-II"],
    "arc": ["ARC-Challenge", "ARC-Easy"],
    "bbh": [
        "boolean_expressions", "causal_judgement", "date_understanding", "disambiguation_qa",
        "dyck_languages", "formal_fallacies", "geometric_shapes", "hyperbaton",
        "logical_deduction_five_objects", "logical_deduction_seven_objects",
        "logical_deduction_three_objects", "movie_recommendation", "multistep_arithmetic_two",
        "navigate", "object_counting", "penguins_in_a_table", "reasoning_about_colored_objects",
        "ruin_names", "salient_translation_error_detection", "snarks", "sports_understanding",
        "temporal_sequences", "tracking_shuffled_objects_five_objects",
        "tracking_shuffled_objects_seven_objects", "tracking_shuffled_objects_three_objects",
        "web_of_lies", "word_sorting",
    ],
    "bfcl_v3": [
        "irrelevance", "java", "javascript", "live_irrelevance", "live_multiple",
        "live_parallel_multiple", "live_parallel", "live_relevance", "live_simple",
        "multi_turn_base", "multi_turn_long_context", "multi_turn_miss_func",
        "multi_turn_miss_param", "multiple", "parallel_multiple", "parallel", "simple",
    ],
    "ceval": [
        "accountant", "advanced_mathematics", "art_studies", "basic_medicine",
        "business_administration", "chinese_language_and_literature", "civil_servant",
        "clinical_medicine", "college_chemistry", "college_economics", "college_physics",
        "college_programming", "computer_architecture", "computer_network",
        "discrete_mathematics", "education_science", "electrical_engineer",
        "environmental_impact_assessment_engineer", "fire_engineer", "high_school_biology",
        "high_school_chemistry", "high_school_chinese", "high_school_geography",
        "high_school_history", "high_school_mathematics", "high_school_physics",
        "high_school_politics", "ideological_and_moral_cultivation", "law", "legal_professional",
        "logic", "mao_zedong_thought", "marxism", "metrology_engineer", "middle_school_biology",
        "middle_school_chemistry", "middle_school_geography", "middle_school_history",
        "middle_school_mathematics", "middle_school_physics", "middle_school_politics",
        "modern_chinese_history", "operating_system", "physician", "plant_protection",
        "probability_and_statistics", "professional_tour_guide", "sports_science",
        "tax_accountant", "teacher_qualification", "urban_and_rural_planner",
        "veterinary_medicine",
    ],
    "chinese_simpleqa": [
        "中华文化", "人文与社会科学", "工程、技术与应用科学", "生活、艺术与文化", "社会", "自然与自然科学",
    ],
    "cmmlu": [
        "agronomy", "anatomy", "ancient_chinese", "arts", "astronomy", "business_ethics",
        "chinese_civil_service_exam", "chinese_driving_rule", "chinese_food_culture",
        "chinese_foreign_policy", "chinese_history", "chinese_literature",
        "chinese_teacher_qualification", "clinical_knowledge", "college_actuarial_science",
        "college_education", "college_engineering_hydrology", "college_law",
        "college_mathematics", "college_medical_statistics", "college_medicine",
        "computer_science", "computer_security", "conceptual_physics",
        "construction_project_management", "economics", "education", "electrical_engineering",
        "elementary_chinese", "elementary_commonsense", "elementary_information_and_technology",
        "elementary_mathematics", "ethnology", "food_science", "genetics", "global_facts",
        "high_school_biology", "high_school_chemistry", "high_school_geography",
        "high_school_mathematics", "high_school_physics", "high_school_politics",
        "human_sexuality", "international_law", "journalism", "jurisprudence",
        "legal_and_moral_basis", "logical", "machine_learning", "management", "marketing",
        "marxist_theory", "modern_chinese", "nutrition", "philosophy", "professional_accounting",
        "professional_law", "professional_medicine", "professional_psychology",
        "public_relations", "security_study", "sociology", "sports_science",
        "traditional_chinese_medicine", "virology", "world_history", "world_religions",
    ],
    "competition_math": ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"],
    "docmath": ["complong_testmini", "compshort_testmini", "simplong_testmini", "simpshort_testmini"],
    "gpqa": ["gpqa_diamond", "gpqa_extended", "gpqa_main"],
    "iquiz": ["EQ", "IQ"],
    "math_500": ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"],
    "mmlu": [
        "abstract_algebra", "anatomy", "astronomy", "business_ethics", "clinical_knowledge",
        "college_biology", "college_chemistry", "college_computer_science", "college_mathematics",
        "college_medicine", "college_physics", "computer_security", "conceptual_physics",
        "econometrics", "electrical_engineering", "elementary_mathematics", "formal_logic",
        "global_facts", "high_school_biology", "high_school_chemistry",
        "high_school_computer_science", "high_school_european_history", "high_school_geography",
        "high_school_government_and_politics", "high_school_macroeconomics",
        "high_school_mathematics", "high_school_microeconomics", "high_school_physics",
        "high_school_psychology", "high_school_statistics", "high_school_us_history",
        "high_school_world_history", "human_aging", "human_sexuality", "international_law",
        "jurisprudence", "logical_fallacies", "machine_learning", "management", "marketing",
        "medical_genetics", "miscellaneous", "moral_disputes", "moral_scenarios", "nutrition",
        "philosophy", "prehistory", "professional_accounting", "professional_law",
        "professional_medicine", "professional_psychology", "public_relations",
        "security_studies", "sociology", "us_foreign_policy", "virology", "world_religions",
    ],
    "mmlu_pro": [
        "biology", "business", "chemistry", "computer science", "economics", "engineering",
        "health", "history", "law", "math", "other", "philosophy", "physics", "psychology",
    ],
    "mmlu_redux": [
        "abstract_algebra", "anatomy", "astronomy", "business_ethics", "clinical_knowledge",
        "college_biology", "college_chemistry", "college_computer_science", "college_mathematics",
        "college_medicine", "college_physics", "computer_security", "conceptual_physics",
        "econometrics", "electrical_engineering", "elementary_mathematics", "formal_logic",
        "global_facts", "high_school_biology", "high_school_chemistry",
        "high_school_computer_science", "high_school_european_history", "high_school_geography",
        "high_school_government_and_politics", "high_school_macroeconomics",
        "high_school_mathematics", "high_school_microeconomics", "high_school_physics",
        "high_school_psychology", "high_school_statistics", "high_school_us_history",
        "high_school_world_history", "human_aging", "human_sexuality", "international_law",
        "jurisprudence", "logical_fallacies", "machine_learning", "management", "marketing",
        "medical_genetics", "miscellaneous", "moral_disputes", "moral_scenarios", "nutrition",
        "philosophy", "prehistory", "professional_accounting", "professional_law",
        "professional_medicine", "professional_psychology", "public_relations",
        "security_studies", "sociology", "us_foreign_policy", "virology", "world_religions",
    ],
    "mmmlu": [
        "AR_XY", "BN_BD", "DE_DE", "ES_LA", "FR_FR", "HI_IN", "ID_ID",
        "IT_IT", "JA_JP", "KO_KR", "NL_NL", "PT_BR", "SW_KE", "ZH_CN",
    ],
    "musr": ["murder_mysteries", "object_placements", "team_allocation"],
    "needle_haystack": ["chinese", "english"],
    "process_bench": ["gsm8k", "math", "olympiadbench", "omnimath"],
    "race": ["high", "middle"],
    "super_gpqa": [
        "Aeronautical and Astronautical Science and Technology", "Agricultural Engineering",
        "Animal Husbandry", "Applied Economics", "Aquaculture", "Architecture", "Art Studies",
        "Astronomy", "Atmospheric Science", "Basic Medicine", "Biology",
        "Business Administration", "Chemical Engineering and Technology", "Chemistry",
        "Civil Engineering", "Clinical Medicine", "Computer Science and Technology",
        "Control Science and Engineering", "Crop Science", "Education",
        "Electrical Engineering", "Electronic Science and Technology",
        "Environmental Science and Engineering", "Food Science and Engineering",
        "Forestry Engineering", "Forestry", "Geography",
        "Geological Resources and Geological Engineering", "Geology", "Geophysics", "History",
        "Hydraulic Engineering", "Information and Communication Engineering",
        "Instrument Science and Technology", "Journalism and Communication",
        "Language and Literature", "Law", "Library, Information and Archival Management",
        "Management Science and Engineering", "Materials Science and Engineering",
        "Mathematics", "Mechanical Engineering", "Mechanics", "Metallurgical Engineering",
        "Military Science", "Mining Engineering", "Musicology",
        "Naval Architecture and Ocean Engineering", "Nuclear Science and Technology",
        "Oceanography", "Optical Engineering", "Petroleum and Natural Gas Engineering",
        "Pharmacy", "Philosophy", "Physical Education", "Physical Oceanography", "Physics",
        "Political Science", "Power Engineering and Engineering Thermophysics", "Psychology",
        "Public Administration", "Public Health and Preventive Medicine", "Sociology",
        "Stomatology", "Surveying and Mapping Science and Technology", "Systems Science",
        "Textile Science and Engineering", "Theoretical Economics",
        "Traditional Chinese Medicine", "Transportation Engineering", "Veterinary Medicine",
        "Weapon Science and Technology",
    ],
    "tool_bench": ["in_domain", "out_of_domain"],
}


def seed_builtin_datasets(db):
    print(f"Starting seed: {len(BUILTIN_DATASETS)} datasets")

    existing_names = {d.name for d in db.query(Dataset).filter(Dataset.is_builtin == True).all()}
    print(f"Found {len(existing_names)} existing builtin datasets")

    new_count = 0
    update_count = 0

    for dataset_data in BUILTIN_DATASETS:
        name = dataset_data["name"]
        subsets = DATASET_SUBSETS.get(name)
        existing = db.query(Dataset).filter(Dataset.name == name).first()

        if existing:
            existing.standard_name = dataset_data.get("standard_name")
            existing.category = dataset_data.get("category")
            existing.tags = dataset_data.get("tags")
            existing.link = dataset_data.get("link")
            existing.subsets = subsets
            if not existing.is_builtin:
                existing.is_builtin = True
            update_count += 1
        else:
            new_dataset = Dataset(
                name=name,
                standard_name=dataset_data.get("standard_name"),
                category=dataset_data.get("category"),
                tags=dataset_data.get("tags"),
                subsets=subsets,
                link=dataset_data.get("link"),
                is_builtin=True,
                is_public=True,
                is_readonly=True,
            )
            db.add(new_dataset)
            new_count += 1

    db.commit()
    print(f"Created {new_count} new datasets, updated {update_count} existing datasets")
    print("Seed completed successfully!")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_builtin_datasets(db)
    except Exception as e:
        print(f"Error during seed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
