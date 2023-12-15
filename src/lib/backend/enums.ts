export const faceScopeToString = (v: number) => ({
  0: 'non-local',
  1: 'local',
}[v])

export const facePersistencyToString = (v: number) => ({
  1: 'on-demand',
  0: 'persistent',
  2: 'permanent',
}[v])

export const linkTypeToString = (v: number) => ({
  0: 'point-to-point',
  1: 'multi-access',
  2: 'ad-hoc',
}[v])

export const faceEventKindToString = (v: number) => ({
  1: 'CREATED',
  2: 'DESTROYED',
  3: 'UP',
  4: 'DOWN',
}[v])

export const contentTypeRepr = (v: number) => {
  if (v == 0) {
    return 'BLOB'
  } else if (v == 1) {
    return 'LINK'
  } else if (v == 2) {
    return 'KEY'
  } else if (v == 3) {
    return 'NACK'
  } else {
    return v
  }
}


export const signatureTypeRepr = (v: number) => {
  if (v == 0) {
    return 'DigestSha256'
  } else if (v == 1) {
    return 'SignatureSha256WithRsa'
  } else if (v == 3) {
    return 'SignatureSha256WithEcdsa'
  } else if (v == 4) {
    return 'SignatureHmacWithSha256'
  } else if (v == 5) {
    return 'SignatureEd25519'
  } else {
    return v
  }
}

export const nackReasonRepr = (v: number) => {
  if (v == 0) {
    return '0 None'
  } else if (v == 50) {
    return '50 Congestion'
  } else if (v == 100) {
    return '100 Duplicate'
  } else if (v == 150) {
    return '150 NoRoute'
  } else {
    return `${v} Unknown`
  }
}
