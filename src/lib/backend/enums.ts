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
