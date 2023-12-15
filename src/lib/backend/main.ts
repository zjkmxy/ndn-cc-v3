/* eslint-disable @typescript-eslint/no-unused-vars */
import { Endpoint } from "@ndn/endpoint"
import { FwTracer, type FwFace } from "@ndn/fw"
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
import { FaceEventMsg, type FaceEventNotification } from "./face-event-notification"
import { CongestionAvoidance, TcpCubic, fetch as fetchSegments } from "@ndn/segmented-object"
import { SequenceNum } from "@ndn/naming-convention2"

const DefaultUrl = 'ws://localhost:9696/'

export const endpoint: Endpoint = new Endpoint()
let nfdWsFace: FwFace | undefined = undefined
export const face = writable<FwFace | undefined>()
export const faceEvents = writable<FaceEventNotification[]>([])

export const connectToNfd = async () => {
  if (nfdWsFace) {
    return
  }
  nfdWsFace = await WsTransport.createFace({ l3: { local: true } }, DefaultUrl)
  enableNfdPrefixReg(nfdWsFace, {
    signer: digestSigning,
  })
  face.set(nfdWsFace)
}

export const disconnectFromNfd = () => {
  if (nfdWsFace) {
    nfdWsFace.close()
    nfdWsFace = undefined
  }
  face.set(nfdWsFace)
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

export const monitorFaceEvents = async () => {
  // fetchSegments is not supposed to be working with sequence numbers, but I can abuse the convention
  const continuation = fetchSegments("/localhost/nfd/faces/events", {
    segmentNumConvention: SequenceNum,
    retxLimit: Number.MAX_SAFE_INTEGER,
    lifetimeAfterRto: 60000,
    ca: new class extends TcpCubic {
      override increase(now: number, rtt: number) {
        // Rate limit: not supported by default implementation
        const { cwnd } = this;
        if (cwnd > 3) {
          return;
        }
        return super.increase(now, rtt);
      }
      override decrease(now: number) { return super.decrease(now); }
    }
  })
  for await (const segment of continuation) {
    // This loop will never finish
    const event = Decoder.decode(segment.content, FaceEventMsg)
    faceEvents.update(items => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event.event as any)['time'] = Date.now()
      items.push(event.event)
      return items
    })
  }
}

FwTracer.enable()