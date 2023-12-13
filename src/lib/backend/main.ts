/* eslint-disable @typescript-eslint/no-unused-vars */
import { Endpoint } from "@ndn/endpoint"
import type { FwFace } from "@ndn/fw"
import { WsTransport } from "@ndn/ws-transport"
import { ControlCommand, enableNfdPrefixReg } from "@ndn/nfdmgmt"
import { Data, Interest, Name, Signer, digestSigning } from '@ndn/packet'
import { readable, writable } from "svelte/store"
import { Decoder } from "@ndn/tlv"
import { GeneralStatus } from "./general-status"
import { FaceStatusMsg } from "./face-status"
import { FibStatus } from "./fib-status"
import { RibStatus } from "./rib-status"
import { StrategyChoiceMsg } from "./strategy-choice"

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

const fetchList = async (moduleName: string) => {
  const name = new Name(`/localhost/nfd/${moduleName}`)
  const data = await endpoint.consume(new Interest(
    name,
    Interest.CanBePrefix,
    Interest.MustBeFresh,
    Interest.Lifetime(1000),
  ))
  // TODO: Fetch segmentations
  return data.content
}

export const getForwarderStatus = async () => {
  const result = await fetchList('status/general')
  return Decoder.decode(result, GeneralStatus)
}

export const getFaceList = async () => {
  const result = await fetchList('faces/list')
  return Decoder.decode(result, FaceStatusMsg)
}

export const getFibList = async () => {
  const result = await fetchList('fib/list')
  return Decoder.decode(result, FibStatus)
}

export const getRibList = async () => {
  const result = await fetchList('rib/list')
  return Decoder.decode(result, RibStatus)
}


export const getStrategyChoiceList = async () => {
  const result = await fetchList('strategy-choice/list')
  return Decoder.decode(result, StrategyChoiceMsg)
}
