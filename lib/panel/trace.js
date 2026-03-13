/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

export function trace_start(name)
{
	performance.mark(`${name}-start`)
}

export function trace_stop(name)
{
	performance.mark(`${name}-stop`)
	performance.measure(name, `${name}-start`, `${name}-stop`)
}

export function trace_resolve(name)
{
	return performance.getEntriesByName(name)
}
