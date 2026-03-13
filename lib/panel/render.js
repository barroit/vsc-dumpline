/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(lib/panel/node.m4)dnl

import { canvas, root } from '../../panel/index.js'

const chunk_box_div = document.createElement('div')
const chunk_box_node = chunk_box_div

chunk_box_div.style.position = 'absolute'

function calc_wd_size(line_h, ck_size)
{
	const lines = Math.ceil(window.innerHeight / line_h)
	const size = Math.ceil(lines / ck_size)

	return size
}

function on_resize(ctx)
{
	ctx.wd_size = calc_wd_size(ctx.line_h, ctx.ck_size)
}

export function render_init(ck_size, nr_ck, line_h, cleanup)
{
	const ctx = {}

	ctx.ck_h = line_h * ck_size
	ctx.wd_size = calc_wd_size(line_h, ck_size)
	ctx.wd_overdraw = Math.ceil(39 / ck_size)

	ctx.wd_max = nr_ck
	ctx.ck_size = ck_size

	const on_resize_fn = on_resize.bind(undefined, ctx)
	const on_resize_desc = [ 'resize', on_resize_fn ]

	cleanup.push(on_resize_desc)
	window.addEventListener(...on_resize_desc, { passive: true })

	return ctx
}

function init_node(ck, offset)
{
	const box = chunk_box_node.cloneNode()

	box.style.top = `${offset}px`
	box.appendChild(ck)

	return box
}

function add_chunk(cks, begin, end, ck_h)
{
	for (; begin < end; begin++) {
		const offset = ck_h * begin
		const node = init_node(cks[begin], offset)

		canvas.appendChild(node)
	}
}

function del_chunk(cks, begin, end)
{
	for (; begin < end; begin++)
		PARENT_OF(cks[begin]).remove()
}

function slide_window(cks, prev_begin, begin, prev_end, end, ck_h)
{
	const next_begin = Math.max(prev_begin, begin)
	const next_end = Math.min(prev_end, end)

	if (next_begin > next_end) {
		add_chunk(cks, begin, end, ck_h)
		del_chunk(cks, prev_begin, prev_end)
		return
	}

	if (begin < prev_begin)
		add_chunk(cks, begin, prev_begin, ck_h)
	if (end > prev_end)
		add_chunk(cks, prev_end, end, ck_h)

	if (prev_begin < begin)
		del_chunk(cks, prev_begin, begin)
	if (prev_end > end)
		del_chunk(cks, end, prev_end)
}

export function render_window_once(ctx, cks)
{
	const left = Math.floor(root.scrollTop / ctx.ck_h)
	const right = left + ctx.wd_size

	const begin = Math.max(0, left - ctx.wd_overdraw)
	const end = Math.min(ctx.wd_max, right + ctx.wd_overdraw)

	add_chunk(cks, begin, end, ctx.ck_h)

	ctx.prev_left = left
	ctx.prev_begin = begin
	ctx.prev_end = end
}

export function render_window(ctx, cks)
{
	const left = Math.floor(root.scrollTop / ctx.ck_h)
	const right = left + ctx.wd_size

	if (ctx.prev_left == left)
		return

	const begin = Math.max(0, left - ctx.wd_overdraw)
	const end = Math.min(ctx.wd_max, right + ctx.wd_overdraw)

	slide_window(cks, ctx.prev_begin, begin, ctx.prev_end, end, ctx.ck_h)

	ctx.prev_left = left
	ctx.prev_begin = begin
	ctx.prev_end = end
}
