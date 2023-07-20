# Reading modes

Read-only, Navigation controls, Focus mode, Click-to-select (instead of edit) and Bionic mode (Bionic reading). All these modes can be enabled independently or in groups via a topbar button and commands in Command palette.

![Reading modes readme](https://github.com/fbgallet/roam-extension-bionic-text/assets/74436347/d1bb6d4e-c534-4ffa-b224-daf1fda7c176)

For each mode, you can choose to enable it only via the command palette, or via the topbar button, or when the graph is loaded (which can be useful for sensitive data). Read-only and navigation controls can also be automatically enabled on mobile only.

### Read-only

Block content and page title can't be edited, but you can still click on links, checkboxes, buttons and all other controls.

You can increase letter spacing and line height for better readability.

### Navigation controls

Inserts very subtle controls (arrows in cardinal directions) in the bottom right-hand corner of the main page.

- **Up/Down** move to the **previous/next sibling block**. Hotheys: `Ctrl+Alt+Up/Down arrow` by default. If there is no next sibling block, a double chevron is displayed and you navigate to the next sibling block of the first parent to have a next sibling. If there is no previous sibling block, you navigate to the parent.
- **Left/Right** move to the **parent/child block**. `Ctrl+Alt+Left/Right arrow` by default.

### Click-to-select

When you click in a block, it will be selected (blue highlighted) instead of edited on the first click. If you click again (and Read-only is not enabled), you will enter in edit mode. It's like a light, responsive read-only mode!

### Focus mode

Only the currently hovered or edited block is visible, everything else (other blocks, bullets, title, sidebar, top bar, etc.) becomes partially or completely transparent depending on the chosen opacity level (from 0 to 0.5). Simply move the mouse to the margin to make all blocks reappear, or hover over an element to make it appear.

### Bionic mode
Display all texts in a similar way as '[Bionic Reading](https://bionic-reading.com)': put in bold the first part of words, allegedly for **faster, more focused reading and better memorization**

![image](https://github.com/fbgallet/roam-extension-bionic-text/assets/74436347/1c79a45a-99f3-4915-9b0b-c816aba5758c)


This extension makes changes only on the HTML level (current page display), not on your data!

Settings for Bionic mode:
  - **fixation** (percentage of word in bold, from 0 to 100)          
      - default: 50
  - **saccade** (applies every x words, from 1 to 5)          
      - default: 1

---------------
If you find my work useful and want to encourage me to continue and improve the existing extensions or produce new ones, you can buy me a coffee ☕ [https://buymeacoffee.com/fbgallet](https://buymeacoffee.com/fbgallet) and follow me on Twitter: [@fbgallet](https://twitter.com/fbgallet).
Thanks in advance for your support! 🙏
