import { type Decoder, type Encoder, EvDecoder, NNI } from "@ndn/tlv";
import { toUtf8 } from "@ndn/util";

const TT = {
  NfdVersion: 0x80,
  StartTimestamp: 0x81,
  CurrentTimestamp: 0x82,
  NNameTreeEntries: 0x83,
  NFibEntries: 0x84,
  NPitEntries: 0x85,
  NMeasurementsEntries: 0x86,
  NCsEntries: 0x87,
  NInInterests: 0x90,
  NInData: 0x91,
  NInNacks: 0x97,
  NOutInterests: 0x92,
  NOutData: 0x93,
  NOutNacks: 0x98,
  NSatisfiedInterests: 0x99,
  NUnsatisfiedInterests: 0x9a,
};

const EVD = new EvDecoder<GeneralStatus>("GeneralStatus")
  .add(TT.NfdVersion, (t, { text }) => t.nfdVersion = text)
  .add(TT.StartTimestamp, (t, { nni }) => t.startTimestamp = nni)
  .add(TT.CurrentTimestamp, (t, { nni }) => t.currentTimestamp = nni)
  .add(TT.NNameTreeEntries, (t, { nni }) => t.nNameTreeEntries = nni)
  .add(TT.NFibEntries, (t, { nni }) => t.nFibEntries = nni)
  .add(TT.NPitEntries, (t, { nni }) => t.nPitEntries = nni)
  .add(TT.NMeasurementsEntries, (t, { nni }) => t.nMeasurementsEntries = nni)
  .add(TT.NCsEntries, (t, { nni }) => t.nCsEntries = nni)
  .add(TT.NInInterests, (t, { nni }) => t.nInInterests = nni)
  .add(TT.NInData, (t, { nni }) => t.nInData = nni)
  .add(TT.NInNacks, (t, { nni }) => t.nInNacks = nni)
  .add(TT.NOutInterests, (t, { nni }) => t.nOutInterests = nni)
  .add(TT.NOutData, (t, { nni }) => t.nOutData = nni)
  .add(TT.NOutNacks, (t, { nni }) => t.nOutNacks = nni)
  .add(TT.NSatisfiedInterests, (t, { nni }) => t.nSatisfiedInterests = nni)
  .add(TT.NUnsatisfiedInterests, (t, { nni }) => t.nUnsatisfiedInterests = nni)
  .setIsCritical(() => false);

/** NFD Management GeneralStatus struct. */
export class GeneralStatus {
  public static decodeFrom(decoder: Decoder): GeneralStatus {
    return EVD.decodeValue(new GeneralStatus(), decoder);
  }

  public constructor(
    public nfdVersion = "",
    public startTimestamp = 0,
    public currentTimestamp = 0,
    public nNameTreeEntries = 0,
    public nFibEntries = 0,
    public nPitEntries = 0,
    public nMeasurementsEntries = 0,
    public nCsEntries = 0,
    public nInInterests = 0,
    public nInData = 0,
    public nInNacks = 0,
    public nOutInterests = 0,
    public nOutData = 0,
    public nOutNacks = 0,
    public nSatisfiedInterests = 0,
    public nUnsatisfiedInterests = 0,
  ) { }

  public encodeTo(encoder: Encoder) {
    encoder.prependValue(
      [TT.NfdVersion, toUtf8(this.nfdVersion)],
      [TT.StartTimestamp, NNI(this.startTimestamp)],
      [TT.CurrentTimestamp, NNI(this.currentTimestamp)],
      [TT.NNameTreeEntries, NNI(this.nNameTreeEntries)],
      [TT.NFibEntries, NNI(this.nFibEntries)],
      [TT.NPitEntries, NNI(this.nPitEntries)],
      [TT.NMeasurementsEntries, NNI(this.nMeasurementsEntries)],
      [TT.NCsEntries, NNI(this.nCsEntries)],
      [TT.NInInterests, NNI(this.nInInterests)],
      [TT.NInData, NNI(this.nInData)],
      [TT.NInNacks, NNI(this.nInNacks)],
      [TT.NOutInterests, NNI(this.nOutInterests)],
      [TT.NOutData, NNI(this.nOutData)],
      [TT.NOutNacks, NNI(this.nOutNacks)],
      [TT.NSatisfiedInterests, NNI(this.nSatisfiedInterests)],
      [TT.NUnsatisfiedInterests, NNI(this.nUnsatisfiedInterests)],
    );
  }
}