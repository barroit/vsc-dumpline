# SPDX-License-Identifier: GPL-3.0-or-later

name := dumpline

pnpm ?= pnpm
pnpm += install
pnpm-d := $(pnpm) -D

m4 ?= m4
m4 := printf '%s\n%s' 'changequote([[, ]])' 'undefine(shift)' | $(m4) -

esbuild ?= esbuild
esbuild += --bundle --format=esm
esbuild += --define:NULL=null --define:NAME='"$(name)"'

terser ?= terser
terser += --module --ecma 2020 --mangle --comments false \
	  --compress 'passes=3,pure_getters=true,unsafe=true'

prefix := build
m4-prefix := $(prefix)/m4

ifneq ($(minimize),)
	minimize := -terser
endif

ifneq ($(debug),)
	debug := -debug
endif

m4-y :=
archive-in :=

bundle-y :=
prem4 :=

.PHONY: install uninstall publish
install:

lib-in   := $(wildcard lib/*.js)
lib-m4-y := $(addprefix $(m4-prefix)/,$(lib-in))

include panel.mak

dumpline-in   := entry.js $(wildcard cmd/*.js)
dumpline-m4-y := $(addprefix $(m4-prefix)/,$(dumpline-in))
dumpline-y    := $(prefix)/entry.js

m4-y += $(lib-m4-y) $(dumpline-m4-y)

$(m4-y): $(m4-prefix)/%: % $(prem4)
	mkdir -p $(@D)
	$(m4) $< >$@

$(dumpline-y)1: $(dumpline-m4-y) $(lib-m4-y)
	$(esbuild) --banner:js="import { createRequire } from 'node:module'; \
		   		var require = createRequire(import.meta.url);" \
		   --sourcemap --platform=node --external:vscode --outfile=$@ $<

bundle-y += $(dumpline-y)
terser-y := $(addsuffix 1-terser,$(bundle-y))
debug-y  := $(addsuffix -debug,$(bundle-y))

$(terser-y): %1-terser: %1
	$(terser) <$< >$@

$(bundle-y): %: %1$(minimize)
	head -n1 entry.js >$@
	printf '\n' >>$@
	cat $< >>$@

$(debug-y): %-debug: %1
	ln -f $< $@
	ln -f $< $*

package-in := $(wildcard package/*.json)
package-y  := package.json

$(package-y): %: %.in $(package-in)
	$(m4) $< >$@

archive-in += $(addsuffix $(debug),$(bundle-y))
archive-in += README.md $(wildcard image/**/*)
archive-y  := $(prefix)/$(name).vsix

$(archive-y): $(archive-in) $(package-y)
	vsce package --skip-license -o $@

install: $(archive-y)
	code --install-extension $<

uninstall:
	code --uninstall-extension \
	     $$(code --list-extensions | grep $(name) || printf '39\n')

publish: $(archive-y)
	vsce publish --skip-license

.PHONY: clean $(preclean) distclean $(predistclean)

clean: $(preclean)
	rm -f $(archive-y)
	rm -f $(m4-y)
	rm -f $(bundle-y)*

distclean: clean $(predistclean)
	rm -f $(package-y)
