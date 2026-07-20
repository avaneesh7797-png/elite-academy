---
title: Studio Video Backend
emoji: 🎬
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
---

# Studio Video Backend (free text-to-video)

A tiny, fast text-to-video model (**AnimateDiff-Lightning**, 4-step) that runs on
Hugging Face's **free ZeroGPU** tier and powers the **Studio** app's
"Real AI (free)" video engine.

## Deploy it (once, ~5 min)

1. Go to **https://huggingface.co/new-space**
2. **Space name:** e.g. `studio-video` · **SDK:** Gradio · **Hardware:** **ZeroGPU** (free)
   *(if ZeroGPU isn't offered, pick the free "CPU basic" only as a last resort — it will be slow; ZeroGPU is the one you want)*
3. Create the Space, then upload these three files: `app.py`, `requirements.txt`, `README.md`
4. Wait for it to build (first build installs torch/diffusers — a few minutes).
5. When it shows the video UI, it's live. Note the URL host, e.g.
   `https://<your-username>-studio-video.hf.space`

## Connect it to the Studio app

Send me the Space host, or set it yourself in Vercel → Studio project → Environment Variables:

```
STUDIO_VIDEO_SPACES = <your-username>-studio-video.hf.space
```

Redeploy. Now "Real AI (free)" generates through **your** GPU-backed Space.

## Honest limits

- ZeroGPU is free but has a **daily quota** and **cold-starts** when idle (first
  request after a nap can take ~30–60s while it wakes).
- It's still community hardware — but because it's *yours*, it's far more
  predictable than random public Spaces, and the app is pinned to it.
