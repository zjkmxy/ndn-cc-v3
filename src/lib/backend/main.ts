/* eslint-disable @typescript-eslint/no-unused-vars */
import { Endpoint } from "@ndn/endpoint"
import type { FwFace } from "@ndn/fw"
import { WsTransport } from "@ndn/ws-transport"
import { ControlCommand, enableNfdPrefixReg } from "@ndn/nfdmgmt"
import { Data, Name, Signer, digestSigning } from '@ndn/packet'
import { readable, writable } from "svelte/store"

const DefaultUrl = 'ws://localhost:9696/'

export const endpoint: Endpoint = new Endpoint()
let nfdWsFace: FwFace | undefined = undefined
const faceSignal = writable<FwFace | undefined>()
export const face = readable(faceSignal)

export const connectToNfd = async () => {
  if (nfdWsFace) {
    return
  }
  nfdWsFace = await WsTransport.createFace({ l3: { local: true } }, DefaultUrl)
  enableNfdPrefixReg(nfdWsFace, {
    signer: digestSigning,
  })
  faceSignal.set(nfdWsFace)
}

export const disconnectFromNfd = () => {
  if (nfdWsFace) {
    nfdWsFace.close()
    nfdWsFace = undefined
  }
  faceSignal.set(nfdWsFace)
}
