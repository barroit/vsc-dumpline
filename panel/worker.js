/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import { png_acquire_filter, png_apply_filter } from '../lib/worker/png.js'

const canvas = new OffscreenCanvas(39, 39)

function init_ck(w, h)
{
	const size = h * (1 + w * 4)
	const buf = new Uint8Array(size)

	return buf
}

function fill_ck(ck, rgbas, w)
{
	const sl_size = w * 4
	let src_idx = rgbas.length - sl_size
	let dst_idx = ck.length - sl_size - 1

	for (; src_idx >= 0; src_idx -= sl_size, dst_idx -= sl_size + 1) {
		const filter = png_acquire_filter(rgbas, src_idx, sl_size)
		const src = rgbas.subarray(src_idx, src_idx + sl_size)

		png_apply_filter(filter, rgbas, src_idx, sl_size)

		ck[dst_idx] = filter
		ck.set(src, dst_idx + 1)
	}
}

function on_mesg({ data: [ id, wk_idx, bitmap, prefix, ck_idx, ck_cnt ] })
{
	const d2 = canvas.getContext('2d', { willReadFrequently: true })
	const w = bitmap.width
	const h = bitmap.height

	canvas.width = w
	canvas.height = h

	d2.drawImage(bitmap, 0, 0)
	bitmap.close()

	const { data: rgbas } = d2.getImageData(0, 0, w, h)
	const ck = init_ck(w, h)
	const data = [ id, wk_idx, ck.buffer, prefix, ck_idx, ck_cnt, w, h ]

	fill_ck(ck, rgbas, w)
	self.postMessage(data, [ ck.buffer ])
}

self.onmessage = on_mesg
