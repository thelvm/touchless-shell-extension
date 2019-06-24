INSTALL_DIR = ~/.local/share/gnome-shell/extensions/touchless@thelvm.com

install:
	mkdir -p $(INSTALL_DIR)
	cp extensions.js metadata.json $(INSTALL_DIR)