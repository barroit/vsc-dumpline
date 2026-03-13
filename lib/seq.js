/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

export function seq_wait(map, key)
{
	let resolve
	const promise = new Promise(r => resolve = r)

	map.set(key, resolve)
	return promise
}

export function seq_wake(map, key)
{
	const resolve = map.get(key)

	resolve()
	map.delete(key)
}
