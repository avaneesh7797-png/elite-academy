# Studio — free text-to-video backend.
#
# Deploy this as your OWN Hugging Face Space on the free ZeroGPU tier. It runs
# AnimateDiff-Lightning (a fast, few-step text-to-video model) and exposes a
# Gradio API the Studio app auto-discovers. Because it's YOUR Space, it's far
# more reliable than random public ones — and I can pin the app straight to it.
#
# Model: ByteDance/AnimateDiff-Lightning (4-step) on top of a realism base.
# ~2s clips generated in a few seconds on the shared A100.

import torch
import gradio as gr
import spaces
from diffusers import AnimateDiffPipeline, MotionAdapter, EulerDiscreteScheduler
from diffusers.utils import export_to_video
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file

DEVICE = "cuda"
DTYPE = torch.float16
BASE = "emilianJR/epiCRealism"           # realism base checkpoint
REPO = "ByteDance/AnimateDiff-Lightning"  # lightning motion adapter
CKPT = "animatediff_lightning_4step_diffusers.safetensors"

# Load once at startup.
adapter = MotionAdapter().to(DEVICE, DTYPE)
adapter.load_state_dict(load_file(hf_hub_download(REPO, CKPT), device=DEVICE))
pipe = AnimateDiffPipeline.from_pretrained(BASE, motion_adapter=adapter, torch_dtype=DTYPE).to(DEVICE)
pipe.scheduler = EulerDiscreteScheduler.from_config(
    pipe.scheduler.config, timestep_spacing="trailing", beta_schedule="linear"
)


@spaces.GPU(duration=60)
def generate(prompt: str):
    prompt = (prompt or "").strip() or "a cinematic scene"
    output = pipe(prompt=prompt, guidance_scale=1.0, num_inference_steps=4)
    frames = output.frames[0]
    # Export to an mp4 file; Gradio serves it and returns a URL over the API.
    path = export_to_video(frames, fps=8)
    return path


demo = gr.Interface(
    fn=generate,
    inputs=gr.Text(label="Prompt", placeholder="a drone shot over turquoise ocean waves at sunrise"),
    outputs=gr.Video(label="Generated video"),
    title="Studio Video Backend",
    description="Fast free text-to-video (AnimateDiff-Lightning) for the Studio app.",
    api_name="generate",  # the endpoint the Studio app calls
    allow_flagging="never",
)

if __name__ == "__main__":
    demo.queue(max_size=8).launch()
