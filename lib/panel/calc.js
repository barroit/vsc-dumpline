/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(lib/panel/utf16.m4)dnl

import { utf16_class, utf16_class_su, utf16_width } from './utf16.js'

export function calc_tabspan(len)
{
	return -len & (utf16_width[CLS_TAB] - 1) || utf16_width[CLS_TAB]
}

export function calc_digit_width(n)
{
	return (Math.log10(n) >>> 0) + 1
}

export function calc_str_width(str)
{
	let width = 0
	let idx

	for (idx = 0; idx < str.length; idx++) {
		const c1 = str.charCodeAt(idx)

		if (c1 == 9) {
			width += calc_tabspan(width)

		} else if ((c1 & 0xfc00) != 0xd800) {
			width += utf16_width[utf16_class[c1]]

		} else {
			idx++

			const c2 = str.charCodeAt(idx)
			const cls_idx = (c1 & 0x3ff) * 0x400 + (c2 & 0x3ff)

			width += utf16_width[utf16_class_su[cls_idx]]
		} 
	}

	return width
}
