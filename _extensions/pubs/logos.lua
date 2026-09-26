-- {{< logos images/funding >}}
-- Shows every image in the folder as a logo grid, in filename order.
-- Filenames become the alt text: "01_nsf_grfp.png" -> "nsf grfp" (a leading number just sets the order).
local exts = { png = true, jpg = true, jpeg = true, svg = true, webp = true, gif = true }

local function esc(s)
  return (s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;"))
end

return {
  ["logos"] = function(args)
    local dir = pandoc.utils.stringify(args[1] or "images/funding")
    local root = os.getenv("QUARTO_PROJECT_DIR") or "."
    local ok, files = pcall(pandoc.system.list_directory, root .. "/" .. dir)
    if not ok then
      quarto.log.warning("logos: folder not found: " .. dir)
      return pandoc.RawBlock("html", "")
    end
    table.sort(files)
    local items = {}
    for _, f in ipairs(files) do
      local ext = f:match("%.([%w]+)$")
      if ext and exts[ext:lower()] and not f:match("^[_%.]") then
        local alt = f:gsub("%.[%w]+$", ""):gsub("^%d+[_%-%s]*", ""):gsub("[_%-]+", " ")
        table.insert(items, string.format(
          '<div class="logo-tile"><img src="%s/%s" alt="%s" loading="lazy"></div>',
          esc(dir), esc(f), esc(alt)))
      end
    end
    if #items == 0 then return pandoc.RawBlock("html", "") end
    return pandoc.RawBlock("html", '<div class="logo-grid">' .. table.concat(items, "") .. "</div>")
  end
}
