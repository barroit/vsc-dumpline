/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
divert(-1)

define(mod_256, (($1) & 0xff))

define(to_s8, ((($1) << 24) >> 24))

divert(0)dnl

function test_bpp(rgbas, begin, size)
{
	const end = begin + size
	let score = 0

	for (; begin < end; begin++) {
		const u8 = rgbas[begin]

		score += Math.abs(to_s8(u8))
	}

	return score
}

function test_none(rgbas, begin, end)
{
	return test_bpp(rgbas, begin, end - begin)
}

function test_sub(rgbas, begin, end)
{
	let score = test_bpp(rgbas, begin, 4)
	let left = rgbas[begin]

	begin += 4

	for (; begin < end; begin++, left = rgbas[begin - 4]) {
		const u8 = mod_256(rgbas[begin] - left)

		score += Math.abs(to_s8(u8))
	}

	return score
}

function test_up(rgbas, begin, end, prev_begin)
{
	if (begin == 0)
		return test_bpp(rgbas, begin, end - begin)

	let score = 0

	for (; begin < end; begin++, prev_begin++) {
		const u8 = mod_256(rgbas[begin] - rgbas[prev_begin])

		score += Math.abs(to_s8(u8))
	}

	return score
}

function test_average_sub_once(rgbas, begin, end)
{
	let score = test_bpp(rgbas, begin, 4)
	let left = rgbas[begin]

	begin += 4

	for (; begin < end; begin++, left = rgbas[begin - 4]) {
		const u8 = mod_256(rgbas[begin] - (left >> 1))

		score += Math.abs(to_s8(u8))
	}

	return score
}

function test_average_up_once(rgbas, begin, prev_begin)
{
	let score = 0
	const end = begin + 4

	for (; begin < end; begin++, prev_begin++) {
		const up = rgbas[prev_begin]
		const u8 = mod_256(rgbas[begin] - (up >> 1))

		score += Math.abs(to_s8(u8))
        }

	return score
}

function test_average(rgbas, begin, end, prev_begin)
{
	if (begin == 0)
		return test_average_sub_once(rgbas, begin, end)

	let score = test_average_up_once(rgbas, begin, prev_begin)

	begin += 4
	prev_begin += 4

	for (; begin < end; begin++, prev_begin++) {
		const left = rgbas[begin - 4]
		const up = rgbas[prev_begin]
		const u8 = mod_256(rgbas[begin] - (left + up >> 1))

		score += Math.abs(to_s8(u8))
	}

	return score
}

function pick_predictor(left, up, up_left)
{
	const p  = left + up - up_left
	const pa = Math.abs(p - left)
	const pb = Math.abs(p - up)
	const pc = Math.abs(p - up_left)

	if (pa <= pb && pa <= pc)
		return left
	else if (pb <= pc)
		return up
	else
		return up_left
}

function test_paeth(rgbas, begin, end, prev_begin)
{
	if (begin == 0)
		return test_sub(rgbas, begin, end)

	let score = test_up(rgbas, begin, begin + 4, prev_begin)

	begin += 4
	prev_begin += 4

	for (; begin < end; begin++, prev_begin++) {
		const pred = pick_predictor(rgbas[begin - 4],
					    rgbas[prev_begin],
					    rgbas[prev_begin - 4])
		const u8 = mod_256(rgbas[begin] - pred)

		score += Math.abs(to_s8(u8))
	}

	return score
}

export function png_acquire_filter(rgbas, begin, sl_size)
{
	const tests = [
		[ 0x00, test_none    ],
		[ 0x01, test_sub     ],
		[ 0x02, test_up      ],
		[ 0x03, test_average ],
		[ 0x04, test_paeth   ],
	]
	const best = [ -1 >>> 0, 0x39 ]

	const end = begin + sl_size
	const prev_begin = begin - sl_size

	for (const [ filter, test ] of tests) {
		const score = test(rgbas, begin, end, prev_begin)

		if (best[0] > score) {
			best[0] = score
			best[1] = filter
		}
	}

	return best[1]
}

function apply_none()
{
	return
}

function apply_sub(rgbas, begin, end)
{
	for (end -= 1; end >= begin + 4; end--)
		rgbas[end] = mod_256(rgbas[end] - rgbas[end - 4])
}

function apply_up(rgbas, begin, end, prev_begin)
{
	if (begin == 0)
		return

	for (; begin < end; begin++, prev_begin++)
		rgbas[begin] = mod_256(rgbas[begin] - rgbas[prev_begin])
}

function apply_average_once(rgbas, begin, end)
{
	for (end -= 1; end >= begin + 4; end--)
		rgbas[end] = mod_256(rgbas[end] - (rgbas[end - 4] >> 1))
}

function apply_average(rgbas, begin, end, prev_begin)
{
	if (begin == 0) {
		apply_average_once(rgbas, begin, end)
		return
	}

	let prev_end = prev_begin + end - begin

	for (end -= 1, prev_end -= 1; end >= begin + 4; end--, prev_end--) {
		const left = rgbas[end - 4]
		const up = rgbas[prev_end]

		rgbas[end] = mod_256(rgbas[end] - (left + up >> 1))
	}

	for (; end >= begin; end--, prev_end--)
		rgbas[end] = mod_256(rgbas[end] - (rgbas[prev_end] >> 1))
}

function apply_paeth(rgbas, begin, end, prev_begin)
{
	if (begin == 0) {
		apply_sub(rgbas, begin, end)
		return
	}

	let prev_end = prev_begin + end - begin

	for (end -= 1, prev_end -= 1; end >= begin + 4; end--, prev_end--) {
		const pred = pick_predictor(rgbas[end - 4],
					    rgbas[prev_end],
					    rgbas[prev_end - 4])

		rgbas[end] = mod_256(rgbas[end] - pred)
	}

	apply_up(rgbas, begin, begin + 4, prev_begin)
}

export function png_apply_filter(filter_idx, rgbas, begin, sl_size)
{
	const filters = [
		apply_none,
		apply_sub,
		apply_up,
		apply_average,
		apply_paeth,
	]

	const filter = filters[filter_idx]
	const end = begin + sl_size
	const prev_begin = begin - sl_size

	filter(rgbas, begin, end, prev_begin)
}
