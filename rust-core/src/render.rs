use pulldown_cmark::{Parser, Options, html};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn render_markdown(input: &str) -> String {
    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_FOOTNOTES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);
    
    let parser = Parser::new_ext(input, opts);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}
