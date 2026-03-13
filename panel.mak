# SPDX-License-Identifier: GPL-3.0-or-later

npm-packages := tailwindcss

tailwindcss ?= tailwindcss
tailwindcss += --minify

panel-prefix  := $(prefix)/panel
module-prefix := node_modules

html-in := $(wildcard panel/*.html)
html-y  := $(panel-prefix)/index.html

prem4 := $(html-y)

$(html-y): $(prefix)/%: $(html-in)
	mkdir -p $(@D)
	$(m4) $* >$@

packages-in := $(addprefix $(module-prefix)/,$(npm-packages))
packages-y  := $(addsuffix /$(package-y),$(packages-in))

$(packages-y): $(module-prefix)/%/$(package-y):
	$(pnpm-d) $*
	touch $(package-y).in

panel-lib-in   := $(wildcard lib/panel/*.js)
panel-lib-m4-y := $(addprefix $(m4-prefix)/,$(panel-lib-in))

m4-y += $(panel-lib-m4-y)

panel-in   := panel/index.js
panel-m4-y := $(addprefix $(m4-prefix)/,$(panel-in))
panel-y    := $(panel-prefix)/index.js

m4-y += $(panel-m4-y)
bundle-y += $(panel-y)

$(panel-y)1: $(panel-m4-y) $(lib-m4-y)  $(panel-lib-m4-y) $(packages-y)
	mkdir -p $(@D)
	$(esbuild) --sourcemap=inline --outfile=$@ $<

css-in := $(wildcard panel/*.html)
css-y  := $(panel-prefix)/index.css

archive-in += $(css-y)

$(css-y): $(css-in) $(packages-y)
	mkdir -p $(@D)
	$(tailwindcss) --cwd panel >$@

utf16-class-y := $(panel-prefix)/utf16_class

archive-in += $(utf16-class-y)

worker-lib-in   := $(wildcard lib/worker/*.js)
worker-lib-m4-y := $(addprefix $(m4-prefix)/,$(worker-lib-in))

m4-y += $(worker-lib-m4-y)

worker-in   := panel/worker.js
worker-m4-y := $(addprefix $(m4-prefix)/,$(worker-in))
worker-y    := $(panel-prefix)/worker.js

m4-y += $(worker-m4-y)
bundle-y += $(worker-y)

$(worker-y)1: $(worker-m4-y) $(panel-lib-m4-y) $(worker-lib-m4-y)
	mkdir -p $(@D)
	$(esbuild) --sourcemap=inline --outfile=$@ $<

$(utf16-class-y): scripts/gen-char-class.py
	$< $@

preclean := preclean

preclean:
	rm -f $(css-y)
	rm -f $(html-m4-y)
	rm -f $(html-y)
	rm -f $(panel-y)*

predistclean := predistclean

predistclean:
	rm -f $(utf16-class-y)*
	find $(module-prefix) -mindepth 1 -maxdepth 1 -exec rm -rf {} \;
