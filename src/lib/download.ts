/** Saves text as a file on the user's device, through the browser's normal download. */
export function downloadTextFile(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  // Some browsers only honour a click on a link that is in the page.
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser time to begin the download before the address stops working.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
