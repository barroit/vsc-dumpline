/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

const scheme_in = {
include(package/config.json)dnl
}

function remap_scheme([ key_in, val ])
{
	const key = key_in.slice(NAME.length + 1)

	return [ key, val ]
}

const scheme_ent_in = Object.entries(scheme_in)
const scheme_ent = scheme_ent_in.map(remap_scheme)
const scheme = Object.fromEntries(scheme_ent)

export const opt_scheme = scheme

export function opt_ensure_valid(opt)
{
	for (const [ key, val ] of scheme_ent) {
		const {
			type: opt_type,
			enum: opt_vals,
			default: opt_fb,
		} = val

		const input = opt[key]
		const type = typeof input

		if (type != opt_type ||
		    opt_vals && !opt_vals.includes(input))
			opt[key] = opt_fb
	}
}
