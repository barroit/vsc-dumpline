/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

const table = new Int32Array(256)

{
	let idx

	for (let idx = 0; idx < 256; idx++) {
		let c = idx
		let k

		for (k = 0; k < 8; k++)
			c = (c >>> 1) ^ (0xedb88320 & -(c & 1))

		table[idx] = c
	}
}

export default function crc32(...bufs)
{
	let crc = -1

	for (const buf of bufs) {
		let idx

		for (idx = 0; idx < buf.length; idx++) {
			const crc_idx = (crc ^ buf[idx]) & 0xff

			crc = (crc >>> 8) ^ table[crc_idx]
		}
	}

	return (crc ^ -1) >>> 0
}
