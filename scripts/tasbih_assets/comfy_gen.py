"""Генерация ассетов тасбиха через локальный ComfyUI (Krea-2 Turbo; фон вырезает cutout.py).

Запуск: E:\\AI\\bot\\venv\\Scripts\\python.exe comfy_gen.py <jobs.json>
jobs.json — список {"name", "prompt", "w", "h", "seed", "cutout", "hires"}.
Готовые PNG складываются в OUT/<name>.png; уже существующие пропускаются,
поэтому прерванный прогон можно просто запустить заново.
"""
import json, sys, time, urllib.request, urllib.parse, pathlib, uuid

HOST = "http://127.0.0.1:8188"
OUT = pathlib.Path(r"E:\AI\noor_gen")
UNET = "krea2_turbo_int8_convrot.safetensors"


def workflow(prompt, w, h, seed, cutout, hires):
    wf = {
        "10": {"class_type": "UNETLoader", "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "11": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_4b_fp8_scaled.safetensors", "type": "krea2", "device": "default"}},
        "12": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["11", 0], "text": prompt}},
        "13": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["6", 0]}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "3": {"class_type": "KSampler", "inputs": {"model": ["10", 0], "seed": seed, "steps": 8, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "positive": ["6", 0], "negative": ["13", 0],
              "latent_image": ["5", 0], "denoise": 1.0}},
    }
    last = "3"
    if hires:
        wf["20"] = {"class_type": "LatentUpscaleBy", "inputs": {"samples": ["3", 0], "upscale_method": "bislerp", "scale_by": 1.5}}
        wf["21"] = {"class_type": "KSampler", "inputs": {"model": ["10", 0], "seed": seed, "steps": 8, "cfg": 1.0,
                    "sampler_name": "euler", "scheduler": "simple", "positive": ["6", 0], "negative": ["13", 0],
                    "latent_image": ["20", 0], "denoise": 0.4}}
        last = "21"
    wf["8"] = {"class_type": "VAEDecode", "inputs": {"samples": [last, 0], "vae": ["12", 0]}}
    image = ["8", 0]
    wf["9"] = {"class_type": "SaveImage", "inputs": {"images": image, "filename_prefix": "noor"}}
    return wf


def edit_workflow(prompt, w, h, seed, ref_name):
    """Правка по образцу: та же композиция, другой свет/деталь (адаптер identity edit)."""
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_4b_fp8_scaled.safetensors", "type": "krea2", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "4": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "krea2_identity_edit_v1_2_r64.safetensors", "strength_model": 1.0}},
        "10": {"class_type": "LoadImage", "inputs": {"image": ref_name}},
        "14": {"class_type": "ImageScaleToTotalPixels", "inputs": {"image": ["10", 0], "upscale_method": "lanczos", "megapixels": 1.0, "resolution_steps": 64}},
        "30": {"class_type": "VAEEncode", "inputs": {"pixels": ["14", 0], "vae": ["3", 0]}},
        "40": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "5": {"class_type": "Krea2EditModelPatch", "inputs": {"model": ["4", 0], "source_latent": ["30", 0], "ref_boost": 4.0, "ref_boost_a": 1.0,
              "fit_mode": "fit", "vae": ["3", 0], "source_image": ["14", 0], "target_latent": ["40", 0]}},
        "6": {"class_type": "Krea2EditGroundedEncode", "inputs": {"clip": ["2", 0], "prompt": prompt, "image": ["14", 0], "grounding_px": 768, "system_prompt": ""}},
        "7": {"class_type": "Krea2EditGroundedEncode", "inputs": {"clip": ["2", 0], "prompt": "", "image": ["14", 0], "grounding_px": 768, "system_prompt": ""}},
        "41": {"class_type": "KSampler", "inputs": {"model": ["5", 0], "seed": seed, "steps": 10, "cfg": 1.0, "sampler_name": "euler",
               "scheduler": "simple", "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["40", 0], "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["41", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "noor-edit"}},
    }


def upload(path):
    boundary = uuid.uuid4().hex
    data = pathlib.Path(path).read_bytes()
    name = f"noor_{uuid.uuid4().hex[:8]}.png"
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + data + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(HOST + "/upload/image", data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["name"]


def call(path, data=None):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode() if data else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def run(job):
    target = OUT / f"{job['name']}.png"
    if target.exists():
        return "skip"
    target.parent.mkdir(parents=True, exist_ok=True)
    if job.get("init"):
        wf = workflow(job["prompt"], job.get("w", 1024), job.get("h", 1280), job.get("seed", 1), False, False)
        # img2img: латент из готового кадра вместо пустого — композиция сохраняется,
        # меняются свет и небо. Быстрее правки с адаптером и влезает в 8 ГБ.
        wf["50"] = {"class_type": "LoadImage", "inputs": {"image": upload(OUT / job["init"])}}
        wf["5"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["50", 0], "vae": ["12", 0]}}
        wf["3"]["inputs"]["denoise"] = job.get("denoise", 0.6)
    elif job.get("ref"):
        wf = edit_workflow(job["prompt"], job.get("w", 1024), job.get("h", 1280), job.get("seed", 1), upload(OUT / job["ref"]))
    else:
        wf = workflow(job["prompt"], job.get("w", 1024), job.get("h", 1280), job.get("seed", 1),
                      job.get("cutout", False), job.get("hires", False))
    pid = json.loads(call("/prompt", {"prompt": wf, "client_id": uuid.uuid4().hex}))["prompt_id"]
    t0 = time.time()
    while True:
        time.sleep(2)
        try:
            hist = json.loads(call(f"/history/{pid}"))
        except (TimeoutError, OSError):   # пока грузится модель, сервер отвечает с задержкой
            continue
        if pid in hist:
            entry = hist[pid]
            if entry.get("status", {}).get("status_str") == "error":
                raise RuntimeError(json.dumps(entry["status"])[:800])
            img = entry["outputs"]["9"]["images"][0]
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
            target.write_bytes(call(f"/view?{q}"))
            return f"{time.time() - t0:.0f}s"
        if time.time() - t0 > 3600:
            raise TimeoutError(job["name"])


if __name__ == "__main__":
    jobs = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    for job in jobs:
        try:
            print(job["name"], run(job), flush=True)
        except Exception as e:  # продолжаем остальные задания
            print(job["name"], "FAIL", e, flush=True)
