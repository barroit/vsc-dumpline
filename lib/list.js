/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

export class list_head {
	constructor(val) {
		this.val = val
		this.next = this
		this.prev = this
	}
}

function __list_add(entry, prev, next)
{
	next.prev = entry
	entry.next = next
	entry.prev = prev
	prev.next = entry
}

export function list_add(entry, head)
{
	__list_add(entry, head, head.next)
}

export function list_add_tail(entry, head)
{
	__list_add(entry, head.prev, head)
}

export function list_del(entry)
{
	const prev = entry.prev
	const next = entry.next

	next.prev = prev
	prev.next = next

	entry.prev = undefined
	entry.next = undefined
}
