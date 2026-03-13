/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(lib/panel/node.m4)dnl

import { canvas } from '../../panel/index.js'

import { list_head, list_add } from '../../lib/list.js'

const svg_ns = 'http://www.w3.org/2000/svg'
const ck_svg = document.createElementNS(svg_ns, 'svg')
const ck_foreign_object = document.createElementNS(svg_ns, 'foreignObject')
const ck_node = ck_svg

ck_foreign_object.setAttribute('width', '100%')
ck_foreign_object.setAttribute('height', '100%')

ck_svg.setAttribute('xmlns', svg_ns)
ck_svg.appendChild(ck_foreign_object)

function setup_width(ck, tree, wbase, indent)
{
	const box = tree.cloneNode(false)
	const node = tree.children[wbase].cloneNode(true)

	box.appendChild(node)

	if (indent)
		CHILD_TEXT_OF(node) = CHILD_TEXT_OF(node).slice(indent)

	box.style.visibility = 'hidden'
	canvas.appendChild(box)

	const rect = box.getBoundingClientRect()
	const width = rect.width

	canvas.removeChild(box)
	ck.setAttribute('width', width)
}

function setup_height(ck, lines)
{
	const box = CHUNK_DATA_OF(ck)
	const line_height = parseInt(box.style.lineHeight)
	const height = line_height * lines

	ck.setAttribute('height', height)
}

export function chunk_init(size, tree, wbase, indent)
{
	const box = tree.cloneNode(false)
	const ck = ck_node.cloneNode(true)

	if (indent)
		box.style.transform = `translateX(-${indent}ch)`

	CHILD_OF(ck).appendChild(box)

	setup_width(ck, tree, wbase, indent)
	setup_height(ck, size)

	return ck
}

function fill_chunk(ck, lines, size, buf)
{
	const box = CHUNK_DATA_OF(ck)
	let idx

	for (idx = 0; idx < size; idx++)
		buf[idx] = lines[idx]

	box.append(...buf)
}

export function chunk_parse(ck, tree, size)
{
	const lines = tree.children
	let buf = new Array(size)

	let nr = lines.length
	const ret = []

	while (nr != 0) {
		const ck_cp = ck.cloneNode(true)

		if (size > nr) {
			size = nr
			buf = new Array(size)
			setup_height(ck_cp, nr)
		}

		fill_chunk(ck_cp, lines, size, buf)

		ret.push(ck_cp)
		nr -= size
	}

	return ret
}

export function chunk_balence_fast(cks)
{
	const bkts = new Array({ length: cks.length })
	let idx

	for (idx = 0; idx < cks.length; idx++) {
		const head = new list_head()
		const node = new list_head([ cks[idx], idx ])

		list_add(node, head)
		bkts[idx] = head
	}

	return bkts
}

function merge_wgt(wgts, size)
{
	const cap = Math.ceil(wgts.length / size)
	const out = new Array(cap)

	let out_idx = 0
	let idx

	for (idx = 0; idx < wgts.length; ) {
		let sum = 0
		const end = idx + size

		for (; idx < end && idx < wgts.length; idx++)
			sum += wgts[idx]

		out[out_idx++] = sum
	}

	return out
}

export function chunk_balence_slow(cks, ln_wgts, ck_size, max_bkt)
{
	const wgts = merge_wgt(ln_wgts, ck_size)
	const idxs = Array.from({ length: wgts.length }, (_, i) => i)
	const bkts = Array.from({ length: max_bkt },
				() => ([ 0, new list_head() ]))

	idxs.sort((a, b) => wgts[b] - wgts[a])

	for (const idx of idxs) {
		let min = 0
		let cur

		for (cur = 1; cur < max_bkt; cur++) {
			if (bkts[cur][0] < bkts[min][0])
				min = cur
		}

		const node = new list_head([ cks[idx], idx ])

		bkts[min][0] += wgts[idx]
		list_add(node, bkts[min][1])
	}

	return bkts.map(([ _, head ]) => head)
}
