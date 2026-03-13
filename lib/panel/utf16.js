/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

const cls_info = document.getElementById('utf16_class_uri')
const cls_su_info = document.getElementById('utf16_class_su_uri')

const cls_uri = cls_info.dataset.uri
const cls_su_uri = cls_su_info.dataset.uri

const cls_fetch = await fetch(cls_uri)
const cls_su_fetch = await fetch(cls_su_uri)

const cls_buf = await cls_fetch.arrayBuffer()
const cls_su_buf = await cls_su_fetch.arrayBuffer()

export const utf16_class = new Uint8Array(cls_buf)
export const utf16_class_su = new Uint8Array(cls_su_buf)

export const utf16_class_name = [ 'N', 'A', 'F', 'H', 'Na', 'W', 'tab' ]
export const utf16_width =      [  1,   1,   2,   1,   1,    2,    0   ]

export function utf16_init(config)
{
	const cjk = /^ja|^zh|^ko/

	if (cjk.test(config.lang))
		utf16_width[1] = 2
	else
		utf16_width[1] = 1

	utf16_width[6] = config.tabstop
}
