import { Balance } from "@polkadot/types/interfaces";
import { SubstrateEvent } from "@subql/types";

import { calculateFees } from "../helpers/fees";
import { Transfer } from "../types";
import { ensureAccounts, updateTransferStatistics } from "./account";
import { ensureBlock } from "./block";
import { ensureToken } from "./token";

export async function transferHandler(event: SubstrateEvent): Promise<void> {
  const data = event.event.data;
  const from = data[0].toString();
  const to = data[1].toString();
  const amount = data[2];

  const blockNumber = event.block.block.header.number.toNumber();
  const { name, decimals } = ensureToken(blockNumber);
  const blockId = event.block.block.hash.toString();
  const transformedAmount = (amount as Balance).toBigInt();
  const extrinsicHash = event.extrinsic?.extrinsic.hash.toString();
  const timestamp = event.block.timestamp;
  const isSuccess = event.extrinsic ? event.extrinsic.success : false;
  const fees = event.extrinsic ? calculateFees(event.extrinsic) : BigInt(0);

  // to and from
  await ensureAccounts([to, from]);
  await updateTransferStatistics([to, from]);

  // ensure block
  await ensureBlock(blockId);

  const entity = new Transfer(`${blockNumber}-${extrinsicHash}`);
  entity.amount = transformedAmount;
  entity.extrinsicHash = extrinsicHash;
  entity.fees = fees;
  entity.status = isSuccess;
  entity.timestamp = timestamp;
  entity.blockId = blockId;
  entity.fromId = from;
  entity.toId = to;
  entity.token = { name, decimals };
  await entity.save();
}

export async function transferCurrencyHandler(event: SubstrateEvent): Promise<void> {
  const data = event.event.data;
  const currencyId = data[0];
  const from = data[1].toString();
  const to = data[2].toString();
  const amount = data[3];

  const currency = JSON.parse(JSON.stringify(currencyId));
  if (currency.token) {
    const blockNumber = event.block.block.header.number.toNumber();
    const { name: defaultName, decimals: defaultDecimals } = ensureToken(blockNumber);
    const blockId = event.block.block.hash.toString();
    const transformedAmount = (amount as Balance).toBigInt();
    const extrinsicHash = event.extrinsic?.extrinsic.hash.toString();
    const timestamp = event.block.timestamp;
    const isSuccess = event.extrinsic ? event.extrinsic.success : false;
    const fees = event.extrinsic ? calculateFees(event.extrinsic) : BigInt(0);

    const modifiedName: string = currency ? currency?.token : defaultName;

    // to and from
    await ensureAccounts([to, from]);
    await updateTransferStatistics([to, from]);

    // ensure block
    await ensureBlock(blockId);

    const entity = new Transfer(`${blockNumber}-${extrinsicHash}`);
    entity.fromId = from;
    entity.toId = to;
    entity.token = { name: modifiedName, decimals: defaultDecimals };
    entity.amount = transformedAmount;
    entity.timestamp = timestamp;
    entity.extrinsicHash = extrinsicHash;
    entity.status = isSuccess;
    entity.fees = fees;
    entity.blockId = blockId;

    await entity.save();
  }
}
