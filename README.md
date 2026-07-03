# Drape

**See how it fits before you buy it.**

Drape is a mobile app that lets people enter their own body measurements — by hand or estimated automatically from a single photo — and preview how a t-shirt, hoodie, or pair of pants will actually fit them, in 3D and in AR, before they ever try it on.

## How it works

- **Measurements** — fill in a form, or take one photo and let on-device pose estimation (MoveNet) estimate your measurements using your height as the reference.
- **Wardrobe** — add garments with category-specific measurement fields (t-shirt, hoodie, shirt, pants), a color, and an optional product photo.
- **3D preview** — a mannequin shaped from your real measurements wears the garment in real time; drag to rotate, and see an automatic tight / fitted / loose reading for each body region (chest, waist, hips, sleeves, inseam).
- **AR mode** — place the fitted model over your phone's live camera view.
- **AI photorealistic preview (optional)** — an opt-in layer that can call an external image-generation service to render you actually wearing the garment, if you provide your own endpoint.

The core measurement/3D/AR experience runs entirely on-device — no API key or paid service required. The AI photorealistic layer is a separate, optional add-on for anyone who wants to plug in their own service (e.g. a Replicate or Hugging Face Inference Endpoint deployment).

## Tech stack

- Expo SDK 54 + React Native + TypeScript
- Three.js (`expo-gl` / `expo-three`) for the parametric 3D avatar and garment meshes
- `@tensorflow-models/pose-detection` (MoveNet) + `@tensorflow/tfjs-react-native` for on-device photo-based measurement estimation
- `expo-camera` for the AR preview and photo capture
- Zustand + AsyncStorage for local persistence (measurements, wardrobe, settings)

## Getting started

```bash
npm install
npx expo start --tunnel
```

Scan the QR code with your phone's camera (or the Expo Go app) to open it. `--tunnel` is only needed if your phone and computer can't reach each other directly over LAN (e.g. on networks with client/AP isolation).

> Expo Go on your phone must support the SDK version this project targets (currently SDK 54). If you see an "incompatible" error, either update Expo Go from the App Store, or align `expo` (and run `npx expo install --fix`) to whatever SDK your installed Expo Go supports.

## Known limitations

- The AR mode overlays the 3D model on the live camera feed and lets you drag/scale it into position — it is **not** full ARKit/ARCore world-tracking (no surface detection or spatial anchoring).
- Circumference measurements estimated from a photo (chest/waist/hip/neck/thigh) are statistical approximations from pixel widths, not lab-grade measurements — review them before saving.
- The AI photorealistic preview requires you to supply your own compatible endpoint; there is no bundled, zero-setup hosted service for this.
