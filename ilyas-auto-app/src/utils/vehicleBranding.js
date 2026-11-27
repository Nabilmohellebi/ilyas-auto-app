const MIN_RECT_WIDTH = 8
const PLATE_ASPECT_RATIO = 4.6
const DETECTOR_INPUT_SIZE = 640
const DETECTOR_CONFIDENCE = 0.5
const DETECTOR_MODEL_URL = 'https://huggingface.co/faisalthaheem/open-lpr-models/resolve/detector-2026.10.1/onnx/plate_yolox_tiny_640.onnx'

let plateSessionPromise = null

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function toFile(blob, name) {
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}

async function loadPlateDetector() {
  if (!plateSessionPromise) {
    plateSessionPromise = (async () => {
      const ort = await import('onnxruntime-web')
      // Keep the detector on the browser CPU/WASM backend. No photo is sent to an API.
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/'
      ort.env.wasm.numThreads = 1
      ort.env.wasm.proxy = false
      return ort.InferenceSession.create(DETECTOR_MODEL_URL, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })
    })().catch(error => {
      plateSessionPromise = null
      throw new Error('Le détecteur de plaques n’a pas pu être chargé. Vérifie ta connexion internet puis réessaie.')
    })
  }
  return plateSessionPromise
}

function makeLetterboxTensor(bitmap, maxScale = Infinity) {
  const sourceWidth = bitmap.width
  const sourceHeight = bitmap.height
  const scale = Math.min(
    DETECTOR_INPUT_SIZE / sourceWidth,
    DETECTOR_INPUT_SIZE / sourceHeight,
    maxScale,
  )
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const padX = (DETECTOR_INPUT_SIZE - width) / 2
  const padY = (DETECTOR_INPUT_SIZE - height) / 2
  const left = Math.round(padX)
  const top = Math.round(padY)

  const canvas = document.createElement('canvas')
  canvas.width = DETECTOR_INPUT_SIZE
  canvas.height = DETECTOR_INPUT_SIZE
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Le navigateur ne peut pas préparer la photo pour la détection.')
  context.fillStyle = 'rgb(114, 114, 114)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, left, top, width, height)

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const planeSize = DETECTOR_INPUT_SIZE * DETECTOR_INPUT_SIZE
  const tensorData = new Float32Array(planeSize * 3)
  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    tensorData[p] = pixels[i]
    tensorData[planeSize + p] = pixels[i + 1]
    tensorData[planeSize * 2 + p] = pixels[i + 2]
  }

  return {
    data: tensorData,
    scale,
    padX,
    padY,
    sourceWidth,
    sourceHeight,
  }
}

function intersectionOverUnion(a, b) {
  const left = Math.max(a.x1, b.x1)
  const top = Math.max(a.y1, b.y1)
  const right = Math.min(a.x2, b.x2)
  const bottom = Math.min(a.y2, b.y2)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)
  if (!intersection) return 0
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1)
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1)
  const union = areaA + areaB - intersection
  return union > 0 ? intersection / union : 0
}

function suppressPlateDuplicates(detections) {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence)
  const kept = []
  for (const candidate of sorted) {
    if (kept.some(existing => intersectionOverUnion(candidate, existing) > 0.45)) continue
    kept.push(candidate)
  }
  return kept
}

function decodePlatePredictions(output, transform) {
  const dims = output.dims || []
  const data = output.data
  let rows
  let features
  if (dims.length === 3) {
    rows = dims[1]
    features = dims[2]
  } else if (dims.length === 2) {
    rows = dims[0]
    features = dims[1]
  } else {
    throw new Error('Le modèle de détection a renvoyé un format inattendu.')
  }
  if (features < 6 || !rows) throw new Error('La sortie du détecteur de plaques est invalide.')

  const expectedRows = (DETECTOR_INPUT_SIZE / 8) ** 2
    + (DETECTOR_INPUT_SIZE / 16) ** 2
    + (DETECTOR_INPUT_SIZE / 32) ** 2
  if (rows !== expectedRows) {
    throw new Error('La version du détecteur de plaques ne correspond pas à son format attendu.')
  }

  const detections = []
  const { scale, padX, padY, sourceWidth, sourceHeight } = transform
  for (let index = 0; index < rows; index += 1) {
    const offset = index * features
    const confidence = data[offset + 4] * data[offset + 5]
    if (!Number.isFinite(confidence) || confidence < DETECTOR_CONFIDENCE) continue

    const centerX = data[offset]
    const centerY = data[offset + 1]
    const width = data[offset + 2]
    const height = data[offset + 3]
    if (![centerX, centerY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue

    const x1 = clamp((centerX - width / 2 - padX) / scale, 0, sourceWidth)
    const y1 = clamp((centerY - height / 2 - padY) / scale, 0, sourceHeight)
    const x2 = clamp((centerX + width / 2 - padX) / scale, 0, sourceWidth)
    const y2 = clamp((centerY + height / 2 - padY) / scale, 0, sourceHeight)
    if (x2 - x1 < 8 || y2 - y1 < 5) continue
    detections.push({ x1, y1, x2, y2, confidence })
  }
  return suppressPlateDuplicates(detections)
}

async function runPlateDetectorPass(session, ort, bitmap, maxScale = Infinity) {
  const transform = makeLetterboxTensor(bitmap, maxScale)
  const tensor = new ort.Tensor('float32', transform.data, [1, 3, DETECTOR_INPUT_SIZE, DETECTOR_INPUT_SIZE])
  const outputs = await session.run({ [session.inputNames[0]]: tensor })
  const output = outputs[session.outputNames[0]]
  if (!output) throw new Error('Le détecteur de plaques n’a renvoyé aucun résultat.')
  return decodePlatePredictions(output, transform)
}

export async function detectLicensePlate(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
    const ort = await import('onnxruntime-web')
    const session = await loadPlateDetector()
    const primary = await runPlateDetectorPass(session, ort, bitmap)
    let detections = primary

    // Very small images need a second pass without upscaling, matching the model's
    // training-time image scale and preserving tiny plates.
    if (Math.max(bitmap.width, bitmap.height) < DETECTOR_INPUT_SIZE) {
      const native = await runPlateDetectorPass(session, ort, bitmap, 1)
      detections = suppressPlateDuplicates([...primary, ...native])
    }

    if (!detections.length) return null
    // Vehicle photos generally contain a single car. The strongest plate match
    // is selected; the user can still fine-tune the rectangle in the preview.
    const best = detections[0]
    const width = best.x2 - best.x1
    const height = best.y2 - best.y1
    const horizontalPadding = width * 0.025
    const verticalPadding = height * 0.06
    const x1 = clamp(best.x1 - horizontalPadding, 0, bitmap.width)
    const y1 = clamp(best.y1 - verticalPadding, 0, bitmap.height)
    const x2 = clamp(best.x2 + horizontalPadding, 0, bitmap.width)
    const y2 = clamp(best.y2 + verticalPadding, 0, bitmap.height)

    return {
      x: x1 / bitmap.width * 100,
      y: y1 / bitmap.height * 100,
      w: (x2 - x1) / bitmap.width * 100,
      h: (y2 - y1) / bitmap.height * 100,
      angle: 0,
      confidence: best.confidence,
    }
  } catch (error) {
    console.warn('Détection de plaque :', error)
    throw error
  } finally {
    bitmap?.close?.()
  }
}

async function loadLogo(url) {
  if (!url) return null
  return new Promise(resolve => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

export async function createBrandedVehicleImageBlob(source, plateRect, brand = {}) {
  const sourceBlob = typeof source === 'string'
    ? await fetch(source).then(response => {
      if (!response.ok) throw new Error('Impossible de récupérer la photo originale.')
      return response.blob()
    })
    : source
  const bitmap = await createImageBitmap(sourceBlob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close?.()
    throw new Error('Le navigateur ne peut pas personnaliser cette photo.')
  }

  context.drawImage(bitmap, 0, 0)
  const x = clamp(Number(plateRect?.x) || 0, 0, 100) / 100 * canvas.width
  const y = clamp(Number(plateRect?.y) || 0, 0, 100) / 100 * canvas.height
  const width = clamp(Number(plateRect?.w) || 20, 4, 90) / 100 * canvas.width
  const height = clamp(Number(plateRect?.h) || 6, 1.5, 40) / 100 * canvas.height
  const centerX = x + width / 2
  const centerY = y + height / 2
  const radius = Math.min(height * 0.13, width * 0.035)
  const angle = (Number(plateRect?.angle) || 0) * Math.PI / 180
  const brandName = String(brand.shopName || 'Votre showroom').trim().slice(0, 42)
  const accent = /^#[0-9a-f]{6}$/i.test(brand.accentColor || '') ? brand.accentColor : '#d7b15f'

  context.save()
  context.translate(centerX, centerY)
  context.rotate(angle)
  context.shadowColor = 'rgba(15, 23, 42, .22)'
  context.shadowBlur = Math.max(3, height * 0.1)
  context.fillStyle = '#ffffff'
  context.beginPath()
  if (typeof context.roundRect === 'function') context.roundRect(-width / 2, -height / 2, width, height, radius)
  else context.rect(-width / 2, -height / 2, width, height)
  context.fill()
  context.shadowBlur = 0
  context.lineWidth = Math.max(2, height * 0.035)
  context.strokeStyle = accent
  context.stroke()

  const paddingX = width * 0.07
  const paddingY = height * 0.13
  const logo = await loadLogo(brand.logoUrl)
  if (logo && logo.naturalWidth > 0) {
    const availableWidth = width - paddingX * 2
    const availableHeight = height - paddingY * 2
    const fit = Math.min(availableWidth / logo.naturalWidth, availableHeight / logo.naturalHeight)
    const drawWidth = logo.naturalWidth * fit
    const drawHeight = logo.naturalHeight * fit
    context.drawImage(logo, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  } else {
    let fontSize = Math.min(height * 0.5, width / Math.max(brandName.length * 0.62, 5))
    fontSize = Math.max(9, fontSize)
    context.fillStyle = '#172033'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `800 ${fontSize}px Arial, sans-serif`
    context.fillText(brandName.toLocaleUpperCase('fr'), 0, 0, width - paddingX * 2)
  }
  context.restore()
  bitmap.close?.()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('La photo personnalisée n’a pas pu être générée.')), 'image/jpeg', 0.93)
  })
  return blob
}

export async function createBrandedVehicleImageFile(sourceFile, plateRect, brand = {}) {
  const blob = await createBrandedVehicleImageBlob(sourceFile, plateRect, brand)
  const baseName = String(sourceFile?.name || 'vehicule').replace(/\.[^.]+$/, '')
  return toFile(blob, baseName + '-showroom.jpg')
}

function parsePhotoList(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return [] }
  }
  return Array.isArray(value) ? value : []
}

export async function rebrandStoredVehiclePhotos({ supabase, shopName, brandIdentity, onProgress } = {}) {
  if (!supabase) throw new Error('Connexion au stockage indisponible.')
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, images, images_gallery, img')
  if (error) throw error

  const branding = {
    shopName: shopName || 'Nabil Auto',
    logoUrl: brandIdentity?.logoUrl || '',
    accentColor: brandIdentity?.accentColor || '#d7b15f',
  }
  let updated = 0
  let scanned = 0
  let errors = 0

  for (const vehicle of vehicles || []) {
    const next = {
      images: parsePhotoList(vehicle.images),
      images_gallery: parsePhotoList(vehicle.images_gallery),
    }
    let nextMainImage = vehicle.img
    let changed = false
    for (const key of ['images', 'images_gallery']) {
      for (let index = 0; index < next[key].length; index += 1) {
        const item = next[key][index]
        if (!item?.originalUrl || !item?.plateRect) continue
        scanned += 1
        if (
          item.brandingName === branding.shopName
          && item.brandingLogoUrl === branding.logoUrl
          && item.brandingAccentColor === branding.accentColor
        ) continue
        try {
          const blob = await createBrandedVehicleImageBlob(item.originalUrl, item.plateRect, branding)
          const id = globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(36).slice(2))
          const path = `vehicles/branded/${vehicle.id}/${id}.jpg`
          const { error: uploadError } = await supabase.storage.from('vehicle-images').upload(path, blob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: false,
          })
          if (uploadError) throw uploadError
          const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
          const oldUrl = item.url
          next[key][index] = {
            ...item,
            url: data.publicUrl,
            brandedPath: path,
            brandingName: branding.shopName,
            brandingLogoUrl: branding.logoUrl,
            brandingAccentColor: branding.accentColor,
          }
          if (key === 'images' && nextMainImage === oldUrl) nextMainImage = data.publicUrl
          changed = true
          updated += 1
        } catch (error) {
          errors += 1
          console.warn('Re-personnalisation photo véhicule #' + vehicle.id + ':', error)
        }
      }
    }
    if (changed) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ images: next.images, images_gallery: next.images_gallery, img: nextMainImage })
        .eq('id', vehicle.id)
      if (updateError) errors += 1
    }
    onProgress?.({ scanned, updated, errors })
  }
  return { scanned, updated, errors }
}
