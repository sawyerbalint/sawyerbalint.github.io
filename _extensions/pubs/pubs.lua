-- {{< pubs all >}} / {{< pubs selected >}}
-- Inserts the HTML that scripts/build-publications.ts writes to _generated/.
return {
  ["pubs"] = function(args)
    local which = pandoc.utils.stringify(args[1] or "all")
    local root = os.getenv("QUARTO_PROJECT_DIR") or "."
    local path = root .. "/_generated/pubs-" .. which .. ".html"
    local f = io.open(path, "r")
    if not f then
      quarto.log.warning("pubs: " .. path .. " not found (did the pre-render script run?)")
      return pandoc.RawBlock("html", "<p><em>Publication list unavailable.</em></p>")
    end
    local html = f:read("a"); f:close()
    return pandoc.RawBlock("html", html)
  end
}
