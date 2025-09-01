// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { parseBuffer } from "music-metadata";

export const getAudioDuration = async (audio: File) => {
  const buffer = await audio.arrayBuffer();
  const metadata = await parseBuffer(new Uint8Array(buffer), audio.type);
  return metadata.format.duration;
};
