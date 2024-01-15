/* eslint-disable @typescript-eslint/no-unused-vars */
import { Endpoint } from '@ndn/endpoint';
import type { FwFace } from '@ndn/fw';
import { WsTransport } from '@ndn/ws-transport';
import { enableNfdPrefixReg } from '@ndn/nfdmgmt';
import { Component, Interest, Name, digestSigning } from '@ndn/packet';
import { writable } from 'svelte/store';
import { Decoder, Encoder } from '@ndn/tlv';
import { CongestionAvoidance, TcpCubic, fetch as fetchSegments } from '@ndn/segmented-object';
import { SequenceNum } from '@ndn/naming-convention2';
import {
	GeneralStatus,
	FaceStatusMsg,
	FibStatus,
	RibStatus,
	StrategyChoiceMsg,
	FaceEventMsg,
	type FaceEventNotification,
	FaceQueryFilter,
	FaceQueryFilterValue
} from '@ucla-irl/ndnts-aux/nfd-mgmt';
import { LimitedCwnd } from '@ucla-irl/ndnts-aux/utils';

const DefaultUrl = 'ws://localhost:9696/';

export const endpoint: Endpoint = new Endpoint();
let nfdWsFace: FwFace | undefined = undefined;
export const face = writable<FwFace | undefined>();
export type FaceEventWithTime = {
	[Key in keyof FaceEventNotification]: FaceEventNotification[Key];
} & { time: number };
export const faceEvents = writable<FaceEventWithTime[]>([]);

export const connectToNfd = async () => {
	if (nfdWsFace) {
		return;
	}
	nfdWsFace = await WsTransport.createFace({ l3: { local: true } }, DefaultUrl);
	enableNfdPrefixReg(nfdWsFace, {
		signer: digestSigning
	});
	face.set(nfdWsFace);
};

export const disconnectFromNfd = () => {
	if (nfdWsFace) {
		nfdWsFace.close();
		nfdWsFace = undefined;
	}
	face.set(nfdWsFace);
};

const fetchList = async (moduleName: string) => {
	const name = new Name(`/localhost/nfd/${moduleName}`);
	const data = await endpoint.consume(
		new Interest(name, Interest.CanBePrefix, Interest.MustBeFresh, Interest.Lifetime(1000))
	);
	// TODO: Fetch segmentations
	return data.content;
};

export const getForwarderStatus = async () => {
	const result = await fetchList('status/general');
	return Decoder.decode(result, GeneralStatus);
};

export const getFaceList = async () => {
	const result = await fetchList('faces/list');
	return Decoder.decode(result, FaceStatusMsg);
};

export const getFibList = async () => {
	const result = await fetchList('fib/list');
	return Decoder.decode(result, FibStatus);
};

export const getRibList = async () => {
	const result = await fetchList('rib/list');
	return Decoder.decode(result, RibStatus);
};

export const getStrategyChoiceList = async () => {
	const result = await fetchList('strategy-choice/list');
	return Decoder.decode(result, StrategyChoiceMsg);
};

export const monitorFaceEvents = async () => {
	// fetchSegments is not supposed to be working with sequence numbers, but I can abuse the convention
	const continuation = fetchSegments('/localhost/nfd/faces/events', {
		segmentNumConvention: SequenceNum,
		retxLimit: Number.MAX_SAFE_INTEGER,
		lifetimeAfterRto: 1000, // The true timeout timer is the RTO
		rtte: {
			minRto: 60000,
			maxRto: 120000
		},
		ca: new LimitedCwnd(new TcpCubic())
	});
	for await (const segment of continuation) {
		// This loop will never finish
		const event = Decoder.decode(segment.content, FaceEventMsg);
		faceEvents.update((items) => {
			items.push({ time: Date.now(), ...event.event, encodeTo() {} });
			return items;
		});
	}
};

export const queryFaceId = async (uri: string) => {
	const queryFilter = new FaceQueryFilter();
	queryFilter.value.uri = uri;
	const filterMsg = Encoder.encode(queryFilter);

	const result = await endpoint.consume(
		new Interest(
			new Name('/localhost/nfd/faces/query').append(new Component(8, filterMsg)),
			Interest.Lifetime(1000),
			Interest.CanBePrefix,
			Interest.MustBeFresh
		)
	);

	const status = Decoder.decode(result.content, FaceStatusMsg);
	if (status.faces.length <= 0) {
		return undefined;
	} else {
		return status.faces[0].faceId;
	}
};

// FwTracer.enable();
