/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 *
 * https://en.wikipedia.org/wiki/PNG
 */

import {
	existsSync,
	readFileSync,
	writeFileSync,
	createWriteStream,
	createReadStream,
} from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createDeflate } from 'node:zlib'

import crc32 from '../lib/crc32.js'

import { bar_map } from '../entry.js'

export function png_save_chunk(id, ck, prefix, ck_idx)
{
	const buf = Buffer.from(ck)
	const name = `${prefix}/${ck_idx}`

	writeFileSync(name, buf)
}

export function png_save_size(id, prefix, ck_cnt, w, most_h, last_h)
{
	const name = `${prefix}/size`
	const buf = Buffer.alloc(8)
	const h = (ck_cnt - 1) * most_h + last_h

	buf.writeUInt32LE(w, 0)
	buf.writeUInt32LE(h, 4)

	writeFileSync(name, buf)
}

function resolve_size(name)
{
	const buf = readFileSync(name)

	const w = buf.readUInt32LE(0)
	const h = buf.readUInt32LE(4)

	return [ w, h ]
}

function write_signature(stream)
{
	const signature = Buffer.from([
		0x89,
		0x50, 0x4e, 0x47,
		0x0d, 0x0a,
		0x1a,
		0x0a,
	])

	stream.write(signature)
}

function write_ihdr(stream, w, h)
{
	const ihdr = Buffer.alloc(4 + 4 + 13 + 4)

	ihdr.writeUInt32BE(13, 0)
	ihdr.write('IHDR', 4)

	ihdr.writeUInt32BE(w, 8)  // width
	ihdr.writeUInt32BE(h, 12) // height
	ihdr.writeUInt8(8, 16)    // bit depth
	ihdr.writeUInt8(6, 17)    // color type
	ihdr.writeUInt8(0, 18)    // compression method
	ihdr.writeUInt8(0, 19)    // filter method
	ihdr.writeUInt8(0, 20)    // interlace method

	const crc_target = ihdr.subarray(4, 21)
	const crc = crc32(crc_target)

	ihdr.writeUInt32BE(crc, 21)
	stream.write(ihdr)
}

function write_iend(stream)
{
	const iend = Buffer.alloc(4 + 4 + 0 + 4)

	iend.writeUInt32BE(0, 0)
	iend.write('IEND', 4)
	iend.writeUInt32BE(0xae426082, 8)

	stream.write(iend)
}

function stream_file(name)
{
	if (!existsSync(name))
        	return undefined

	return createReadStream(name)
}

function write_idat(stream, ck)
{
	const idat = Buffer.alloc(12)
	const len_buf = idat.subarray(0, 4)
	const type_buf = idat.subarray(4, 8)

	idat.writeUInt32BE(ck.length, 0)
	idat.write('IDAT', 4)

	stream.write(len_buf)
	stream.write(type_buf)
	stream.write(ck)

	const crc_buf = idat.subarray(8)
	const crc = crc32(type_buf, ck)

	idat.writeUInt32BE(crc, 8)
	stream.write(crc_buf)
}

export async function png_merge_chunk(id, prefix)
{
	const bar = bar_map.get(id)
	const stream = createWriteStream(`${prefix}/dump.png`)
	const [ w, h ] = resolve_size(`${prefix}/size`)

	const deflator = createDeflate({ level: 7, chunkSize: 64 * 1024 })
	const write_idat_fn = write_idat.bind(undefined, stream)

	deflator.on('data', write_idat_fn)

	write_signature(stream)
	write_ihdr(stream, w, h)

	let idx
	const end_task = new Promise(r => deflator.on('end', r))

	for (idx = 0; ; idx++) {
		const ck_stream = stream_file(`${prefix}/${idx}`)

		if (!ck_stream) {
			deflator.end()
			break
		}

		bar.report({ message: `merging chunk ${idx}` })

		const ck_task = new Promise(r => ck_stream.on('end', r))

		ck_stream.pipe(deflator, { end: false })
		await ck_task
	}

	await end_task
	write_iend(stream)

	stream.end()
}
