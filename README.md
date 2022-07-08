# roam-extension-bionic-text
Bionic reading adaptation to Roam research

![image](https://user-images.githubusercontent.com/74436347/178004219-55b21070-bd2d-4dcb-ac27-a2a493d51377.png)

Display all texts on your current Roam page in a similar way as '[Bionic Reading](https://bionic-reading.com)': put in bold the first part of words, allegedly for **faster, more focused reading and better memorization**
This extension makes changes only on the HTML level (current page display), not on your data!

### Instructions
- Toggle it with **Shift+Alt+B** or 'B' button in the top bar
    - Button is enabled by default.
    - You can disable it in user settings on [[roam/js/bionic text]] page.
- You can change **user settings** on [[roam/js/bionic text]] __(refresh your graph to apply change)__:
  ⚠️ __this page should be automatically created. If not, delete the existant one and refresh your graph. Otherwise, follow the format below (value are set in child block ):__
      - **fixation** (percentage of word in bold)
          - from 0 to 100
      - **saccade** (applies every x words)
          - from 1 to 5
      - **button** (appears or not in the topbar)
          - yes or no

### Limitations
- Auto-reapply is not working properly when navigating with keyboard
- Bionic view is not immediately applied to new unfolded blocks or blocks opened in the sidebar (you need to focus/unfocus a previous block, or to switch on/off)

---------------
If you find my work useful and want to encourage me to continue and improve the existing extensions or produce new ones, you can buy me a coffee ☕ [https://buymeacoffee.com/fbgallet](https://buymeacoffee.com/fbgallet) and follow me on Twitter: [@fbgallet](https://twitter.com/fbgallet).
Thanks in advance for your support! 🙏
