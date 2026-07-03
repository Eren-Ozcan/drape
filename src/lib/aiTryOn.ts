import { uriToBase64, blobToBase64 } from './imageUtils';

export interface TryOnConfig {
  endpointUrl: string;
  apiToken?: string | null;
}

export interface TryOnRequest extends TryOnConfig {
  personImageUri: string;
  garmentImageUri: string;
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
export async function requestVirtualTryOn(req: TryOnRequest): Promise<string> {
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
