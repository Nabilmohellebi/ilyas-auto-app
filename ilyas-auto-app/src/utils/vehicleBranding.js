const MIN_RECT_WIDTH = 10
const PLATE_ASPECT_RATIO = 4.6

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function toFile(blob, name) {
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}

export async function detectLicensePlate(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(bitmap, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height).data
    const gray = new Uint8Array(width * height)
    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      gray[p] = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    }

    let best = null
    const minWidth = Math.max(70, Math.round(width * 0.13))
    const maxWidth = Math.min(Math.round(width * 0.42), Math.round(height * 1.05))
    const candidateWidths = []
    for (let candidate = minWidth; candidate <= maxWidth; candidate += Math.max(12, Math.round(width * 0.025))) {
      candidateWidths.push(candidate)
    }

    for (const boxWidth of candidateWidths) {
      const boxHeight = Math.round(boxWidth / PLATE_ASPECT_RATIO)
      if (boxHeight < 15 || boxHeight > height * 0.22) continue
      const stepX = Math.max(5, Math.round(boxWidth * 0.12))
      const stepY = Math.max(4, Math.round(boxHeight * 0.2))
      const pixelStep = Math.max(3, Math.round(boxWidth / 45))

      for (let y = Math.round(height * 0.22); y <= height - boxHeight - 2; y += stepY) {
        for (let x = 0; x <= width - boxWidth; x += stepX) {
          let sum = 0
          let sumSq = 0
          let dark = 0
          let bright = 0
          let count = 0
          for (let py = y + 2; py < y + boxHeight - 2; py += pixelStep) {
            for (let px = x + 2; px < x + boxWidth - 2; px += pixelStep) {
              const value = gray[py * width + px]
              sum += value
              sumSq += value * value
              if (value < 92) dark += 1
              if (value > 155) bright += 1
              count += 1
            }
          }
          if (!count) continue
          const mean = sum / count
          const variance = Math.max(0, sumSq / count - mean * mean)
          const deviation = Math.sqrt(variance)
          const darkRatio = dark / count
          const brightRatio = bright / count
          if (mean < 88 || brightRatio < 0.2 || darkRatio < 0.025 || deviation < 22) continue

          // A plate is generally a bright, fairly flat rectangle with dark characters.
          // This is a local computer-vision suggestion, not a guaranteed recognition.
          const contrastScore = clamp((deviation - 18) / 58, 0, 1)
          const darkScore = clamp(darkRatio / 0.16, 0, 1)
          const brightScore = clamp((brightRatio - 0.16) / 0.62, 0, 1)
          const meanScore = clamp((mean - 85) / 130, 0, 1)
          const centerX = (x + boxWidth / 2) / width
          const centerY = (y + boxHeight / 2) / height
          const centerScore = 1 - Math.min(1, Math.abs(centerX - 0.5) / 0.58)
          const lowerScore = clamp((centerY - 0.34) / 0.5, 0, 1)
          const score = contrastScore * 0.25 + darkScore * 0.28 + brightScore * 0.2
            + meanScore * 0.08 + centerScore * 0.11 + lowerScore * 0.08

          if (!best || score > best.score) {
            best = {
              score,
              x: x / width * 100,
              y: y / height * 100,
              w: boxWidth / width * 100,
              h: boxHeight / height * 100,
            }
          }
        }
      }
    }

    if (!best || best.score < 0.46) return null
    return { x: best.x, y: best.y, w: best.w, h: best.h, confidence: best.score }
  } catch (error) {
    console.warn('Détection de plaque indisponible :', error)
    return null
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
  const radius = Math.min(height * 0.13, width * 0.035)
  const brandName = String(brand.shopName || 'Votre showroom').trim().slice(0, 42)
  const accent = /^#[0-9a-f]{6}$/i.test(brand.accentColor || '') ? brand.accentColor : '#d7b15f'

  context.save()
  context.shadowColor = 'rgba(0,0,0,.5)'
  context.shadowBlur = Math.max(3, height * 0.12)
  context.fillStyle = '#101820'
  context.beginPath()
  if (typeof context.roundRect === 'function') context.roundRect(x, y, width, height, radius)
  else context.rect(x, y, width, height)
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
    context.drawImage(logo, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
  } else {
    let fontSize = Math.min(height * 0.5, width / Math.max(brandName.length * 0.62, 5))
    fontSize = Math.max(9, fontSize)
    context.fillStyle = '#ffffff'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `800 ${fontSize}px Arial, sans-serif`
    context.fillText(brandName.toLocaleUpperCase('fr'), x + width / 2, y + height / 2, width - paddingX * 2)
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
    const next = { images: Array.isArray(vehicle.images) ? [...vehicle.images] : [], images_gallery: Array.isArray(vehicle.images_gallery) ? [...vehicle.images_gallery] : [] }
    let changed = false
    for (const key of ['images', 'images_gallery']) {
      for (let index = 0; index < next[key].length; index += 1) {
        const item = next[key][index]
        if (!item?.originalUrl || !item?.plateRect) continue
        scanned += 1
        if (item.brandingName === branding.shopName && item.brandingLogoUrl === branding.logoUrl) continue
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
          }
          if (key === 'images' && vehicle.img === oldUrl) vehicle.img = data.publicUrl
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
        .update({ images: next.images, images_gallery: next.images_gallery, img: vehicle.img })
        .eq('id', vehicle.id)
      if (updateError) errors += 1
    }
    onProgress?.({ scanned, updated, errors })
  }
  return { scanned, updated, errors }
}
