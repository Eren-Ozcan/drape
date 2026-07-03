import { Client, handle_file } from '@gradio/client';
import { GarmentCategory } from '../types/measurements';
import { uriToBase64, blobToBase64 } from './imageUtils';

export type AiProvider = 'custom' | 'hf-space';

export interface TryOnConfig {
  provider: AiProvider;
  endpointUrl: string;
  apiToken?: string | null;
}

export interface TryOnRequest extends TryOnConfig {
  personImageUri: string;
  garmentImageUri: string;
  garmentCategory?: GarmentCategory;
}

export async function requestVirtualTryOn(req: TryOnRequest): Promise<string> {
  if (req.provider === 'hf-space') {
    return requestFreeHfSpaceTryOn(req);
  }
  return requestCustomEndpointTryOn(req);
}

// Generic client for a photorealistic virtual try-on backend. There is no
// single free, zero-setup hosted API for diffusion-based try-on today, so
// this deliberately targets a plain JSON contract that the user points at
// their own endpoint (e.g. a Replicate deployment of IDM-VTON/OOTDiffusion,
// or a Hugging Face Inference Endpoint they provision):
//
//   POST {endpointUrl}
//   Authorization: Bearer {apiToken}        (if provided)
//   { "person_image": "<base64 jpeg>", "garment_image": "<base64 jpeg>" }
//
// Response: either raw image bytes, or JSON containing a base64 image under
// one of: image, output, images[0].
async function requestCustomEndpointTryOn(req: TryOnRequest): Promise<string> {
  if (!req.endpointUrl) {
    throw new Error('AI önizleme endpoint adresi ayarlanmamış. Ayarlar ekranından ekleyebilirsin.');
  }

  const [personImage, garmentImage] = await Promise.all([
    uriToBase64(req.personImageUri),
    uriToBase64(req.garmentImageUri),
  ]);

  const res = await fetch(req.endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.apiToken ? { Authorization: `Bearer ${req.apiToken}` } : {}),
    },
    body: JSON.stringify({ person_image: personImage, garment_image: garmentImage }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sunucu hatası (${res.status}): ${text.slice(0, 300) || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json: any = await res.json();
    const b64 = json.image ?? json.output ?? json.images?.[0] ?? (typeof json === 'string' ? json : null);
    if (!b64) throw new Error('Sunucudan beklenmeyen bir yanıt formatı geldi.');
    return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
  }

  const blob = await res.blob();
  const b64 = await blobToBase64(blob);
  return `data:image/jpeg;base64,${b64}`;
}

// The free path: yisol/IDM-VTON, a public Hugging Face Space running on
// shared ZeroGPU quota (a few minutes/day, unauthenticated or free-account).
// There's no dedicated API — this calls the same Gradio function the Space's
// own web UI calls (api_name "/tryon", confirmed against the Space's
// app.py). It's someone else's community demo, not a stable product API: it
// can be slow (shared queue), briefly down, or change its function signature
// without notice. An optional HF token (from huggingface.co/settings/tokens)
// raises the daily quota from ~2-5 to much more; it is not required.
const HF_TRYON_SPACE = 'yisol/IDM-VTON';
const HF_TRYON_API_NAME = '/tryon';

const GARMENT_CATEGORY_EN: Record<GarmentCategory, string> = {
  tshirt: 'a t-shirt',
  shirt: 'a shirt',
  hoodie: 'a hoodie',
  pants: 'pants',
};

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

function extractResultUri(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const v = value as { url?: string; path?: string };
    if (v.url) return v.url;
    if (v.path) return `https://${HF_TRYON_SPACE.replace('/', '-').toLowerCase()}.hf.space/file=${v.path}`;
  }
  return null;
}

async function requestFreeHfSpaceTryOn(req: TryOnRequest): Promise<string> {
  try {
    const [personBlob, garmentBlob] = await Promise.all([
      uriToBlob(req.personImageUri),
      uriToBlob(req.garmentImageUri),
    ]);

    const client = await Client.connect(HF_TRYON_SPACE, req.apiToken ? { token: req.apiToken as `hf_${string}` } : undefined);

    const result = await client.predict(HF_TRYON_API_NAME, {
      imgs: { background: handle_file(personBlob), layers: [], composite: null },
      garm_img: handle_file(garmentBlob),
      garment_des: GARMENT_CATEGORY_EN[req.garmentCategory ?? 'tshirt'],
      is_checked: true,
      is_checked_crop: true,
      denoise_steps: 30,
      seed: 42,
    });

    const data = result.data as unknown[];
    const uri = extractResultUri(data?.[0]);
    if (!uri) throw new Error('Sunucudan beklenmeyen bir yanıt formatı geldi.');
    return uri;
  } catch (e: any) {
    throw new Error(
      `Ücretsiz Hugging Face demosu şu an yanıt vermedi (${e?.message ?? e}). Bu paylaşılan, ücretsiz bir topluluk ` +
        'demosu olduğu için bazen yoğun/kapalı olabilir — biraz sonra tekrar dene, ya da Ayarlar\'dan kendi servisine geç.'
    );
  }
}
