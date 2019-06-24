'use strict';

const {
    Gio,
    Meta,
    Shell
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Volume = imports.ui.status.volume;

const thisExtension = ExtensionUtils.getCurrentExtension();

const touchlessInterface = Shell.get_file_contents_utf8_sync('~/.touchless/touchless.xml');
const TouchlessProxy = Gio.DBusProxy.makeProxyWrapper(touchlessInterface);

var touchlessProxy;

function showOverview() {
    Main.overview.show();
}

function showApplications() {
    Main.overview.viewSelector.showApps();
}

/* Tile windows side by side. */
function sideBySide() {
    let primary = global.display.get_primary_monitor();
    let workspace = global.workspace_manager.get_active_workspace();

    let windows = workspace.list_windows().filter(w => w.get_monitor() == primary && !w.minimized);
    windows.sort((w1, w2) => w1.get_frame_rect().x - w2.get_frame_rect().x);

    let workArea = workspace.get_work_area_for_monitor(primary);
    let eachWidth = workArea.width / windows.length;

    for (let i = 0; i < windows.length; ++i)
        windows[i].move_resize_frame(true,
            workArea.x + i * eachWidth, workArea.y, eachWidth, workArea.height);
}

function minimizeAll() {
    let workspace = global.workspace_manager.get_active_workspace();
    for (let w of workspace.list_windows())
        w.minimize();
}

function unminimizeAll() {
    let workspace = global.workspace_manager.get_active_workspace();
    for (let w of workspace.list_windows())
        w.unminimize();
}

function maximize() {
    global.display.focus_window.maximize(Meta.MaximizeFlags.BOTH);
}

function minimize() {
    global.display.focus_window.minimize();
}

function switchWorkspace(dir) {
    let workspace = global.workspace_manager.get_active_workspace();
    workspace.get_neighbor(dir).activate(global.get_current_time());
}

function adjustVolume(dir) {
    let mixer = Volume.getMixerControl();

    /* getMixerControl returns a Gvc.MixerControl object.  "Gvc" stands for
     * the libgnome-volume-control library.  There is no reference documentation
     * available for this library, but you can generate it using g-ir-doc-tool. */

    let sink = mixer.get_default_sink();
    let maxLevel = mixer.get_vol_max_norm();

    /* We adjust by 6% of the maximum volume; this is the same step used in gnome-settings-daemon. */
    let step = 0.06 * maxLevel;

    sink.volume = Math.max(0, Math.min(maxLevel, sink.volume + dir * step));
    sink.push_volume();
    log('new volume is ' + sink.volume);

    /* Briefly display an osdWindow popup showing the current volume level.
     * "osd" stands for "on-screen display".  */
    let icon = new Gio.ThemedIcon({
        name: 'audio-volume-medium-symbolic'
    });
    let device = mixer.lookup_device_from_stream(sink);
    Main.osdWindowManager.show(-1, icon, device.get_description(), 100 * sink.volume / maxLevel, 100);
}

function enable() {
    log(`enabling ${thisExtension.metadata.name} version ${thisExtension.metadata.version}`)

    touchlessProxy = new TouchlessProxy(Gio.DBus.session, 'com.thelvm.touchless.daemon', '/com/thelvm/touchless/daemon');

    touchlessProxy.connectSignal('gesture_detected',
        (proxy, senderName, [name]) => {
            log('Gesture detected: ' + name);
        }
    );
}

function disable() {
    log(`disabling ${thisExtension.metadata.name} version ${thisExtension.metadata.version}`);
}