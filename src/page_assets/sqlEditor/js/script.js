import { get_cl_element,confirmBox,executeQuery,fetchData } from "../../../assets/js/scc"
import * as gm from "../../../core/gridMethods"
import Sortable from "sortablejs"
import flatpickr from "flatpickr"
import 'flatpickr/dist/flatpickr.min.css'
import CodeMirror from "codemirror";
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/yonce.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql.js';

const page_element = document.getElementById("currentPage");
const table_el = document.getElementById("editortableDiv");

let primary_column = false;
let where_in = {};
let where_not_in = {};
let like_query = {};
let sort_columns = [];
let column_formatters = {};
let col_name_types = {};
let editable_flag = false;
let currentPage = 1;
let col_names = [];
let initial_row_values = [];
let current_row_id = 0;
let view_query = "";
let sort_col_names = {};
const params = new URLSearchParams(window.location.search);
const modelName = params.get('modelName');
const tableName = params.get('tableName');
if (tableName) document.title = tableName;
let dt_picker = null;

// --- CodeMirror Editor ---
const editor = CodeMirror.fromTextArea(document.getElementById("editorText"), {
    lineNumbers: true,
    lineWrapping: true,
    mode: "text/x-sqlite",
    theme: "yonce",
    autoRefresh: true,
    autofocus: true,
});

window.addEventListener("DOMContentLoaded", async () => {
    const result = await executeQuery('init');
    if (result && result.msg === 'Success') {
        await init();
    }

    document.getElementById('editorButton').onclick = get_editor;
    // Prevent Enter key default behavior in dropdown-menu text inputs
    document.querySelectorAll('.dropdown-menu input[type="text"]').forEach(input => {
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    });
});

async function init() {
    let e1 = document.getElementById("selectedColumn")
    let e2 = document.getElementById("availableColumn")
    document.getElementById("sidebarBtn").onclick = hide_sidebar;
    document.getElementById("editor-button").onclick = run_editor_query;
    Sortable.create(e1,{group:"words",
    animation:150})
    Sortable.create(e2,{group:"words",
    animation:150})
    await get_table_rows();

    const result = await gm.fetchTableFormatter(modelName, tableName);

    column_formatters = result[0][0];
    if (result[0][1]) {
        document.getElementById("viewQuery").classList.remove("hidden");
        document.getElementById("queryInput").value = result[0][1];
        view_query = result[0][1];
    }
    editable_flag = !!result[1];
    if (editable_flag) {
        table_el.classList.add("no_user_select");
    }
    await get_sort();
    await get_columns();
    if (!editable_flag) {
        document.getElementById("multiUpdate").style.display = "none";
    }
}

async function get_sort() {
    const data = await gm.fetchSort(modelName, tableName);
    sort_columns = [...data];
    sort_col_names = {};
    data.forEach(([col, dir]) => {
        sort_col_names[col] = dir;
    });
}

async function get_table_headers(header_rows) {
    await update_column_formatters(header_rows);
    col_names = header_rows.map(h => h[0]);
    primary_column = header_rows[0][1].toLowerCase() === "primary";
    get_table_data(col_names);

    const tbl = table_el.querySelector("thead");
    tbl.innerHTML = "";

    const tr1 = get_cl_element("tr", "headers border-r");
    const tr2 = get_cl_element("tr", "lovRow border-r");

    for (let i = 0; i < header_rows.length; i++) {
        const [col_name, col_type, is_not_null] = header_rows[i];
        col_name_types[col_name] = col_type;
        let th = get_cl_element("th");
        th.setAttribute("nowrap", "");

        // Dropdown menu
        const dropdown_menu = get_cl_element("div", "dropdown-menu flex");
        const input_tag = get_cl_element("input",
            "form-ctrl flex-1 px-2 py-1 text-sm rounded-l-md border border-gray-300 focus:outline-none focus:border-gray-400 focus:ring-3 focus:ring-gray-400/50");
        input_tag.type = "text";
        dropdown_menu.appendChild(input_tag);

        const toggle_btn = get_cl_element("button",
            "group-text btn-sm-outline py-2 px-1 rounded-r-md rounded-l-none",
            null, get_cl_element("span", "fas fa-chevron-down text-xs"));
        toggle_btn.type = "button";
        toggle_btn.setAttribute("aria-haspopup", "menu");
        toggle_btn.setAttribute("aria-expanded", "false");
        toggle_btn.setAttribute("aria-controls", "demo-dropdown-menu-menu");
        dropdown_menu.appendChild(toggle_btn);

        const dropdown = get_cl_element("div", "min-w-56");
        dropdown.setAttribute("data-popover", "");
        dropdown.setAttribute("aria-hidden", "true");

        const role_menu = get_cl_element("div");
        role_menu.setAttribute("role", "menu");
        role_menu.setAttribute("aria-labelledby", "demo-dropdown-menu-trigger");

        const select_all_label = get_cl_element("label",
            "flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded",
            null, get_cl_element("input", "mr-2 input"));
        select_all_label.querySelector("input").type = "checkbox";
        select_all_label.appendChild(document.createTextNode("Select All"));
        role_menu.appendChild(select_all_label);

        role_menu.appendChild(get_cl_element("div", "border-t my-2"));

        const lov_container = get_cl_element("div", "lov-values max-h-40 overflow-y-auto space-y-1 grid");
        role_menu.appendChild(lov_container);

        role_menu.appendChild(get_cl_element("div", "border-t my-2"));

        const btn_wrapper = get_cl_element("div", "flex justify-between p-1");
        const ter_button = get_cl_element("button", "btn-secondary btn-sm", null, document.createTextNode("CLEAR"));
        const prim_button = get_cl_element("button", "btn-primary btn-sm ml-auto", null, document.createTextNode("OK"));
        prim_button.type = "button";
        ter_button.type = "button";
        btn_wrapper.appendChild(ter_button);
        btn_wrapper.appendChild(prim_button);
        role_menu.appendChild(btn_wrapper);

        dropdown.appendChild(role_menu);
        dropdown_menu.appendChild(dropdown);

        const th2 = get_cl_element("th", "py-2", null, dropdown_menu);

        // LOV fetch on toggle
        toggle_btn.addEventListener("click", async function () {
            const isHidden = dropdown.getAttribute("aria-hidden") === "true";
            dropdown.setAttribute("aria-hidden", (!isHidden).toString());
            if (isHidden) {
                const lov_div = th2.querySelector("div.lov-values");
                if (!(col_name in where_in)) where_in[col_name] = [];
                if (!(col_name in where_not_in)) where_not_in[col_name] = [];
                if (where_in[col_name].length === 0 && where_not_in[col_name].length === 0) {
                    lov_div.parentNode.querySelector("input").checked = true;
                }
                lov_div.innerHTML = "";
                let temp_where_in = { ...where_in };
                let temp_where_not_in = { ...where_not_in };
                delete temp_where_in[col_name];
                delete temp_where_not_in[col_name];
                document.getElementById("data-loader").style.display = "";
                const result = await gm.fetchTableData(modelName, tableName, [col_name], temp_where_in, temp_where_not_in, like_query, 1, [], true, true);
                document.getElementById("data-loader").style.display = "none";
                const total_len = result[0].length;
                for (let col_value of result[0]) {
                    let el = get_cl_element("a", "flex items-center px-2 py-0.5 cursor-pointer hover:bg-gray-100 rounded", null,
                        get_cl_element("input", "input mr-2"));
                    el.firstChild.setAttribute("type", "checkbox");
                    if (where_in[col_name].length > 0) {
                        if (col_value[0] !== null) {
                            if (where_in[col_name].includes(col_value[0].toString())) el.firstChild.checked = true;
                        } else if (where_in[col_name].includes("null")) el.firstChild.checked = true;
                    } else if (where_not_in[col_name].length > 0) {
                        if (col_value[0] !== null) {
                            if (!where_not_in[col_name].includes(col_value[0].toString())) el.firstChild.checked = true;
                        } else if (!where_not_in[col_name].includes("null")) el.firstChild.checked = true;
                    } else {
                        el.firstChild.checked = true;
                    }
                    el.appendChild(get_cl_element("label", "label", null, document.createTextNode(col_value[0])));
                    el.querySelector('label').setAttribute('value', col_value[0]);
                    lov_div.appendChild(el);
                    el.firstChild.onchange = function () {
                        if (!el.firstChild.checked && lov_div.parentNode.querySelector("input").checked) {
                            lov_div.parentNode.querySelector("input").checked = false;
                        } else if (el.firstChild.checked && !lov_div.parentNode.querySelector("input").checked) {
                            const ct = lov_div.querySelectorAll("input:checked").length;
                            if (ct === total_len) lov_div.parentNode.querySelector("input").checked = true;
                        }
                    };
                }
                const ct = lov_div.querySelectorAll("input:checked").length;
                if (ct === total_len) lov_div.parentNode.querySelector("input").checked = true;
            }
        });

        select_all_label.querySelector("input").addEventListener("change", function (e) {
            lov_container.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = e.target.checked;
            });
        });

        input_tag.addEventListener("keydown", function (e) {
            const dropdown_el = dropdown_menu.querySelector("div.min-w-56");
            if (dropdown_el.getAttribute("aria-hidden") === "false") {
                if (e.keyCode === 27) {
                    dropdown_el.setAttribute("aria-hidden", "true");
                } else if (e.keyCode === 40) {
                    let current_el = dropdown_el.querySelector("a.selected");
                    if (current_el) {
                        const next_el = current_el.nextElementSibling;
                        if (next_el) {
                            current_el.classList.remove("selected");
                            next_el.classList.add("selected");
                        }
                    } else {
                        const first = dropdown_el.querySelector("a");
                        if (first) first.classList.add("selected");
                    }
                } else if (e.keyCode === 38) {
                    let current_el = dropdown_el.querySelector("a.selected");
                    if (current_el) {
                        const prev_el = current_el.previousElementSibling;
                        if (prev_el) {
                            current_el.classList.remove("selected");
                            prev_el.classList.add("selected");
                        }
                    }
                } else if (e.keyCode === 32) {
                    let current_el = dropdown_el.querySelector("a.selected");
                    if (current_el) current_el.firstChild.click();
                    e.preventDefault();
                } else if (e.key === "Enter") {
                    submit_lov_button(th2, col_name);
                    dropdown_el.setAttribute("aria-hidden", "true");
                    const first = dropdown_el.querySelector("a");
                    if (first) first.classList.add("selected");
                    e.preventDefault();
                }
                return false;
            } else if (e.key === "Enter") {
                let reload_flag = update_like_object();
                if (reload_flag) get_table_data(col_names);
                return false;
            } else if (e.altKey && e.keyCode === 40) {
                dropdown_el.setAttribute("aria-hidden", "false");
                const first = dropdown_el.querySelector("a");
                if (first) first.classList.add("selected");
                return false;
            }
        });

        prim_button.addEventListener("mousedown", function () {
            let ct = th2.querySelectorAll("div.lov-values input:checked").length;
            let total_len = th2.querySelectorAll("div.lov-values input").length;
            setTimeout(function () {
                if (ct === total_len) {
                    if (toggle_btn.childNodes[1]) {
                        toggle_btn.removeChild(toggle_btn.childNodes[0]);
                        toggle_btn.firstChild.style = "";
                    }
                } else if (ct !== 0) {
                    if (!toggle_btn.childNodes[1]) {
                        toggle_btn.firstChild.style = "position:relative;";
                        toggle_btn.classList.add("p-1");
                        toggle_btn.insertBefore(get_cl_element('span', 'fas fa-filter'), toggle_btn.childNodes[0]);
                    }
                }
            }, 600);
            submit_lov_button(th2, col_name);
            dropdown.setAttribute("aria-hidden", "true");
            toggle_btn.setAttribute("aria-expanded", "false");
        });

        ter_button.addEventListener("mousedown", function () {
            let flag = false;
            if (where_in[col_name].length > 0) {
                flag = true;
                where_in[col_name] = [];
            } else if (where_not_in[col_name].length > 0) {
                flag = true;
                where_not_in[col_name] = [];
            }
            if (flag) get_table_data(col_names);
            setTimeout(function () {
                if (toggle_btn.childNodes[1]) {
                    toggle_btn.removeChild(toggle_btn.childNodes[0]);
                    toggle_btn.firstChild.style = "";
                }
            }, 200);
            dropdown.setAttribute("aria-hidden", "true");
            toggle_btn.setAttribute("aria-expanded", "false");
        });

        if (primary_column && i === 0) {
            let el = get_cl_element("input", "form-check-input", "selectAll");
            el.type = "checkbox";
            th.appendChild(el);
            th.id = col_name;
            tr2.appendChild(get_cl_element("th"));
            el.onchange = function () {
                for (let tr of table_el.querySelectorAll("tbody tr")) {
                    if (tr.firstChild.firstChild) {
                        tr.firstChild.firstChild.checked = el.checked;
                    }
                }
            };
        } else if (is_not_null === 1) {
            th.classList.add("min-width", "font-semibold");
            let el = get_cl_element("u", null, null, document.createTextNode(col_name));
            el.appendChild(get_cl_element("span", "fa fa-sort"));
            th.appendChild(el);
            tr2.appendChild(th2);
        } else {
            th.classList.add("min-width", "font-semibold");
            th.appendChild(document.createTextNode(col_name));
            th.appendChild(get_cl_element("span", "fa fa-sort"));
            tr2.appendChild(th2);
        }

        const sort_el = th.querySelector("span.fa-sort");
        if (sort_el) {
            sort_el.addEventListener('click', function () {
                const sort_cols = sort_columns.map(s => s[0]);
                let idx = sort_cols.indexOf(col_name);
                if (idx < 0) idx = sort_cols.length;
                if (this.classList.contains("fa-sort-down")) {
                    sort_columns[idx] = [col_name, "desc"];
                    this.classList.remove("fa-sort-down");
                    this.classList.add("fa-sort-up");
                } else {
                    this.classList.remove("fa-sort-up");
                    this.classList.remove("fa-sort");
                    this.classList.add("fa-sort-down");
                    sort_columns[idx] = [col_name, "asc"];
                }
                get_table_data(col_names);
            });

            th.addEventListener('click', function (e) {
                if (e.target.classList.contains("fa")) return false;
                const col_num = col_names.indexOf(this.firstChild.textContent);
                if (this.classList.contains("selected_col")) {
                    for (let tr of table_el.querySelectorAll("tr")) {
                        tr.childNodes[col_num].classList.remove("selected_col");
                    }
                } else {
                    const other_selected = this.parentNode.querySelector('.selected_col');
                    if (other_selected) {
                        const prev_col = col_names.indexOf(other_selected.firstChild.textContent);
                        for (let tr of table_el.querySelectorAll("tr")) {
                            tr.childNodes[prev_col].classList.remove("selected_col");
                        }
                    }
                    for (let tr of table_el.querySelectorAll("tr")) {
                        tr.childNodes[col_num].classList.add("selected_col");
                    }
                }
            });
        }

        tr1.appendChild(th);
    }

    tbl.appendChild(tr1);
    tbl.appendChild(tr2);
}


async function get_table_data(col_names, page_num = 1) {
    current_row_id = 0;
    initial_row_values = [];
    currentPage = page_num;
    let select_all = primary_column && document.getElementById("selectAll") && document.getElementById("selectAll").checked;

    const selected_header = table_el.querySelector('thead .selected_col');
    let selected_idx = selected_header ? col_names.indexOf(selected_header.firstChild.textContent) : 0;

    document.getElementById("data-loader").style.display = "";

    const data = await gm.fetchTableData(
        modelName,
        tableName,
        col_names,
        where_in,
        where_not_in,
        like_query,
        page_num,
        sort_columns
    );

    document.getElementById("data-loader").style.display = "none";
    const tbl = table_el.querySelector("tbody");
    tbl.innerHTML = "";

    for (const row of data[0]) {
        tbl.appendChild(get_table_row(row, selected_idx, select_all, page_num));
    }

    if (editable_flag) {
        tbl.appendChild(add_insert_row());
    }

    if (data[0].length > -5) {
        const tr = get_cl_element("tr", "footer");
        for (let i = 0; i < col_names.length; i++) {
            tr.appendChild(document.createElement("td"));
        }
        tr.classList.add("hidden");
        tbl.appendChild(tr);
    }
    
    const data_count = await gm.getTableDataCount(
        modelName,
        tableName,
        where_in,
        where_not_in,
        like_query
    );

    const rec_per_page = 1000;
    let inner_text = "";
    let total_pages = "";

    if (data_count >= rec_per_page) {
        inner_text = `${(page_num - 1) * rec_per_page + 1}-${Math.min(page_num * rec_per_page, data_count)} of ${data_count}`;
        total_pages = `of ${Math.floor((data_count - 1) / rec_per_page) + 1}`;
    } else {
        inner_text = `1-${data_count} of ${data_count}`;
        total_pages = "of 1";
    }

    document.getElementById("totalRecordsPanel").innerText = inner_text;
    page_element.parentNode.childNodes[2].textContent = total_pages;
    page_element.setAttribute("maxPages", Math.floor((data_count - 1) / rec_per_page) + 1);    
    page_element.value = currentPage;
}

function not_eq_list(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
        if (!b.includes(a[i])) return true;
    }
    return false;
}

function update_like_object() {
    let startIdx = primary_column ? 1 : 0;
    let reload_flag = false;
    const inputs = document.querySelectorAll("tr.lovRow th input[type=text]");
    for (let idx = 0; idx < inputs.length; idx++) {
        const inp = inputs[idx];
        const val = inp.value;
        const col_name = col_names[idx + startIdx];
        if (val === "") {
            if (like_query.hasOwnProperty(col_name)) {
                delete like_query[col_name];
                reload_flag = true;
            }
        } else {
            if (like_query[col_name] !== val) {
                like_query[col_name] = val;
                reload_flag = true;
            }
        }
    }
    if (Object.keys(like_query).length > 0) {
        reload_flag = true;
    }
    return reload_flag;
}

page_element.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
        let page_val = parseInt(page_element.value, 10);
        const max_page_num = parseInt(page_element.getAttribute("maxPages"), 10);

        if (isNaN(page_val)) {
            page_element.value = currentPage;
            return;
        }

        page_val = Math.max(1, Math.min(page_val, max_page_num));
        page_element.value = page_val;

        if (page_val !== currentPage) {
            get_table_data(col_names, page_val);
        }
    }
});

document.getElementById("firstPageBtn").onclick = () => {
    if (currentPage > 1) {
        page_element.value = 1;
        get_table_data(col_names, 1);
    }
};

document.getElementById("prevPageBtn").onclick = () => {
    if (currentPage > 1) {
        page_element.value = currentPage - 1;
        get_table_data(col_names, currentPage - 1);
    }
};

document.getElementById("nextPageBtn").onclick = () => {
    const maxPage = parseInt(page_element.getAttribute("maxPages"), 10);
    if (currentPage < maxPage) {
        page_element.value = currentPage + 1;
        get_table_data(col_names, currentPage + 1);
    }
};

document.getElementById("lastPageBtn").onclick = () => {
    const maxPage = parseInt(page_element.getAttribute("maxPages"), 10);
    if (currentPage < maxPage) {
        page_element.value = maxPage;
        get_table_data(col_names, maxPage);
    }
};

document.getElementById("refreshBtn").onclick = () => {
    get_sort().then(reload_table_data);
};

function reload_table_data() {
    reset_sort_buttons();
    where_in = {};
    where_not_in = {};
    like_query = {};
    sort_columns = [];
    const selectAllEl = document.getElementById("selectAll");
    if (selectAllEl) selectAllEl.checked = false;
    get_table_data(col_names, 1);
    table_el.querySelectorAll(".lovRow input.form-ctrl").forEach(input => input.value = "");
    table_el.querySelectorAll("thead button.group-text").forEach(btn => {
        if (btn.childNodes[1]) {
            btn.removeChild(btn.childNodes[0]);
            btn.firstChild.style = "";
        }
    });
}

function reset_sort_buttons() {
    table_el.querySelectorAll("thead span.fa-sort-down").forEach(span => {
        span.classList.add("fa-sort");
        span.classList.remove("fa-sort-down");
    });
    table_el.querySelectorAll("thead span.fa-sort-up").forEach(span => {
        span.classList.add("fa-sort");
        span.classList.remove("fa-sort-up");
    });
    table_el.querySelectorAll('th.selected_col').forEach(th => th.classList.remove("selected_col"));
}

function submit_lov_button(th, header_name) {
    
    const selected = [];
    const notSelected = [];

    th.querySelectorAll("div.lov-values input").forEach(input => {
        const value = input.nextElementSibling.getAttribute('value');
        if (input.checked) {
            selected.push(value);
        } else {
            notSelected.push(value);
        }
    });

    let reload = false;
    if (selected.length > notSelected.length) {
        if (not_eq_list(where_in[header_name], [])) {
            reload = true;
            where_in[header_name] = [];
        }
        if (not_eq_list(where_not_in[header_name], notSelected)) {
            reload = true;
            where_not_in[header_name] = notSelected;
        }
    } else {
        if (not_eq_list(where_in[header_name], selected)) {
            reload = true;
            where_in[header_name] = selected;
        }
        if (not_eq_list(where_not_in[header_name], [])) {
            reload = true;
            where_not_in[header_name] = [];
        }
    }
    if (reload) {
        get_table_data(col_names);
    }
}

document.getElementById("excelDownloadBtn").onclick =async function (e) {
    document.getElementById("data-loader").style.display = ""
    await gm.downloadExcel(modelName,[tableName])
    document.getElementById("data-loader").style.display = "none"
}

async function update_column_formatters(header_rows) {
    const numeric_types = ['NUMERIC', 'INTEGER'];
    const default_formatters = { decimals: 2, comma: 0, locale: 0, currency: 0, aggregate: 'SUM' };
    const new_formatters = {};

    // Initialize formatters for numeric columns
    for (const key in default_formatters) {
        new_formatters[key] = {};
        for (const [col_name, col_type] of header_rows.map(row => [row[0], row[1]])) {
            if (numeric_types.includes(col_type)) {
                let value = default_formatters[key];
                if (column_formatters[key] && column_formatters[key][col_name] !== undefined) {
                    const existing = column_formatters[key][col_name];
                    if (!isNaN(existing) && parseInt(existing) > -1) {
                        value = parseInt(existing);
                    } else if (['locale', 'currency', 'aggregate'].includes(key)) {
                        value = existing;
                    }
                }
                new_formatters[key][col_name] = value;
            }
        }
    }

    // Lowercase col_names for internal use
    col_names = header_rows.map(row => row[0].toLowerCase());

    // Assign new formatters to column_formatters
    for (const key in default_formatters) {
        column_formatters[key] = new_formatters[key];
    }

    // Ensure required formatter objects exist
    ['autofiller', 'query', 'lov'].forEach(key => {
        if (!(key in column_formatters)) column_formatters[key] = {};
    });
    column_formatters['date'] = {};
    column_formatters['datetime'] = {};

    // Process LOV and autofiller definitions
    for (const col_name of Object.keys(column_formatters['lov'])) {
        const col_idx = col_names.indexOf(col_name);
        if (col_idx > -1 && !Array.isArray(column_formatters['lov'][col_name])) {
            const lov_parts = column_formatters['lov'][col_name].split('|');
            const proper_col_name = header_rows[col_idx][0];
            const type = lov_parts[0].trim().toLowerCase();
            const value = lov_parts[1] ? lov_parts[1].trim() : '';

            if (type === 'select') {
                delete column_formatters['lov'][col_name];
                if (value.substring(0, 6) === 'select') {
                    const query = lov_parts.slice(1).join('_').trim();
                    column_formatters['query'][proper_col_name] = query;
                    column_formatters['lov'][proper_col_name] = await gm.runSelectQuery(modelName, query);
                } else {
                    const lov_list = value.split(';').map(v => v.trim()).filter(Boolean);
                    column_formatters['lov'][proper_col_name] = lov_list;
                }
            } else if (type === 'autofiller') {
                delete column_formatters['lov'][col_name];
                if (value.substring(0, 6) === 'select') {
                    const query = lov_parts.slice(1).join('|').trim();
                    column_formatters['query'][proper_col_name] = query;
                    const result = await gm.runSelectQuery(modelName, query);
                    column_formatters['autofiller'][proper_col_name] = result;
                    document.getElementById("dataList_div").appendChild(get_dataList(`${proper_col_name}_dataList`, result));
                } else {
                    const autofill_list = value.split(';').map(v => v.trim()).filter(Boolean);
                    column_formatters['autofiller'][proper_col_name] = autofill_list;
                    const dl = document.getElementById(`${proper_col_name}_dataList`);
                    if (dl) dl.remove();
                    document.getElementById("dataList_div").appendChild(get_dataList(`${proper_col_name}_dataList`, autofill_list));
                }
            } else if (type === 'date') {
                delete column_formatters['lov'][col_name];
                column_formatters['date'][proper_col_name] = 1;
            } else if (type === 'datetime') {
                delete column_formatters['lov'][col_name];
                column_formatters['datetime'][proper_col_name] = 1;
            } else {
                console.log("Neither LOV nor Autofiller, please check");
            }
        }
    }
}

document.getElementById("incrDecimals").onclick = async function () {
    const selectedHeader = table_el.querySelector('thead .selected_col');
    if (!selectedHeader) {
        confirmBox("Alert!", "Please select a column");
        return;
    }
    const colName = selectedHeader.innerText;
    if (!(colName in column_formatters["decimals"])) {
        confirmBox("Alert!", "Please select a numeric column");
        return;
    }
    column_formatters["decimals"][colName]++;
    await gm.setTableFormatter(modelName, tableName, colName, { "Decimals": column_formatters["decimals"][colName] });
    table_el.querySelectorAll("td.selected_col").forEach(td => {
        const val = parseFloat(td.getAttribute("title"));
        if (!isNaN(val)) td.innerText = get_col_string(colName, val);
    });
};

document.getElementById("decrDecimals").onclick = async function () {
    const selectedHeader = table_el.querySelector('thead .selected_col');
    if (!selectedHeader) {
        confirmBox("Alert!", "Please select a column");
        return;
    }
    const colName = selectedHeader.innerText;
    if (!(colName in column_formatters["decimals"])) {
        confirmBox("Alert!", "Please select a numeric column");
        return;
    }
    const newDecimals = column_formatters["decimals"][colName] - 1;
    if (newDecimals < 0) return;
    column_formatters["decimals"][colName] = newDecimals;
    await gm.setTableFormatter(modelName, tableName, colName, { "Decimals": newDecimals });
    table_el.querySelectorAll("td.selected_col").forEach(td => {
        const val = parseFloat(td.getAttribute("title"));
        if (!isNaN(val)) td.innerText = get_col_string(colName, val);
    });
};

document.getElementById("showSummaryBtn").onclick = async function () {
    const numericColumns = Object.keys(column_formatters["decimals"]);
    const tfoot = table_el.querySelector("tr.footer");

    if (numericColumns.length === 0) return;

    if (tfoot.classList.contains("hidden")) {
        document.getElementById("data-loader").style.display = "";

        const summaryData = await gm.getSummary(
            modelName,
            tableName,
            numericColumns,
            where_in,
            where_not_in,
            like_query
        );

        document.getElementById("data-loader").style.display = "none";

        numericColumns.forEach((colName, i) => {
            const decimals = column_formatters["decimals"][colName];
            const currency = column_formatters["currency"][colName];
            const locale = column_formatters["locale"][colName];
            const commaFlag = column_formatters["comma"][colName];
            const value = summaryData[i];

            let idx = col_names.indexOf(colName, editable_flag ? 1 : 0);

            let localeOptions = {
                maximumFractionDigits: decimals
            };
            if (currency) {
                localeOptions.style = "currency";
                localeOptions.currency = currency;
                if (decimals < 2) {
                    localeOptions.maximumFractionDigits = decimals;
                }
            }

            let displayValue;
            if (commaFlag) {
                displayValue = value.toLocaleString(locale, localeOptions);
            } else {
                displayValue = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
            }

            tfoot.childNodes[idx].innerText = displayValue;
            tfoot.childNodes[idx].setAttribute("title", value);
        });

        tfoot.classList.remove("hidden");
    } else {
        tfoot.classList.add("hidden");
    }
};

document.getElementById("thousandSepBtn").onclick = async function () {
    const selectedHeader = table_el.querySelector('thead .selected_col');
    if (!selectedHeader) {
        confirmBox("Alert!", "Please select a column");
        return;
    }
    const colName = selectedHeader.innerText;
    if (!(colName in column_formatters["decimals"])) {
        confirmBox("Alert!", "Please select a numeric column");
        return;
    }
    // Toggle comma separator
    column_formatters["comma"][colName] = column_formatters["comma"][colName] ? 0 : 1;
    await gm.setTableFormatter(modelName, tableName, colName, { "Comma": column_formatters["comma"][colName] });
    table_el.querySelectorAll("td.selected_col").forEach(td => {
        const val = parseFloat(td.getAttribute("title"));
        if (!isNaN(val)) {
            td.innerText = get_col_string(colName, val);
        }
    });
};

function move_elements(bt_type, src_id, dest_id) {
    const srcList = document.getElementById(src_id);
    const destList = document.getElementById(dest_id);

    if (bt_type === "all") {
        Array.from(srcList.querySelectorAll("li")).forEach(li => {
            destList.appendChild(li);
        });
    } else if (bt_type === "one") {
        Array.from(srcList.querySelectorAll("li.selectedValue")).forEach(li => {
            destList.appendChild(li);
            li.classList.remove("selectedValue");
        });
    }
}

["allLeft", "allRight", "selectedLeft", "selectedRight"].forEach(btnId => {
    document.getElementById(btnId).onclick = function () {
        move_elements(
            this.getAttribute("bttype"),
            this.getAttribute("src"),
            this.getAttribute("dest")
        );
    };
});

//start from here

function populate_columns(available_column, selected_column) {
    const availableEl = document.getElementById("availableColumn");
    const selectedEl = document.getElementById("selectedColumn");
    availableEl.innerHTML = "";
    selectedEl.innerHTML = "";

    available_column.forEach(col => availableEl.appendChild(get_li_element(col)));
    selected_column.forEach(col => selectedEl.appendChild(get_li_element(col)));
}

function get_li_element(col_name) {
    const el = get_cl_element("li", "dropzone", null, document.createTextNode(col_name));
    el.setAttribute("draggable", true);

    el.onclick = function (e) {
        if (!e.ctrlKey) {
            this.parentNode.querySelectorAll("li.selectedValue").forEach(li => li.classList.remove("selectedValue"));
        }
        this.classList.add("selectedValue");
        e.preventDefault();
    };

    el.ondblclick = function () {
        const destId = this.parentNode.getAttribute("dest");
        if (destId) {
            document.getElementById(destId).appendChild(this);
            this.classList.remove("selectedValue");
        }
    };

    return el;
}

async function get_columns() {
    const data = await gm.fetchColumnsData(modelName, tableName);
    if (!data[1] || data[1].length === 0) {
        confirmBox("Alert!", `No table exists with tablename ${tableName}`);
        return;
    }
    get_table_headers(data[1]);
    let selected_column = data[1].map(row => row[0]);
    if (editable_flag) {
        selected_column = selected_column.slice(1);
    }

    populate_columns(data[0], selected_column);
}

document.getElementById("saveColumnSelection").onclick = async function () {
    const selectedColumns = Array.from(document.getElementById("selectedColumn").children)
        .map(li => li.innerText);

    const result = await gm.updateColumnOrders(modelName, tableName, selectedColumns);

    if (result) {
        get_columns();
    }

    document.getElementById('modal-select-column').classList.add('hidden');
};

document.addEventListener('keydown', function (e) {
    if (e.key === "F2" && editable_flag) {
        const selectedHeader = table_el.querySelector('thead .selected_col');
        if (selectedHeader) {
            if (document.getElementById("modal-update-column").classList.contains("hidden")) {
                update_column_modal(selectedHeader.innerText);
                e.preventDefault();
            }
        } else {
            confirmBox("Alert!", "Please select a column");
        }
    } else if (e.keyCode === 120) {
        if (document.getElementById("editorDiv").style.display === "") {
            run_editor_query();
        }
    } else if (e.ctrlKey && e.keyCode === 67) {
        if (document.getElementById("logtableDiv").style.display !== "none") {
            navigator.clipboard.writeText(get_query_text());
        }
    }
});


function update_column_modal(col_name) {
    let inputEl = document.getElementById("colValue");
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.style.borderBottomRightRadius = 0;
    inputEl.style.borderTopRightRadius = 0;

    // Remove awesomplete wrapper if present
    if (inputEl.parentNode.classList.contains("awesomplete")) {
        const newInput = inputEl.cloneNode(true);
        const parent = inputEl.parentNode.parentNode;
        inputEl.parentNode.remove();
        parent.insertBefore(newInput, parent.firstChild);
        inputEl = newInput;
    }

    inputEl.value = "";
    inputEl.classList.remove("datepicker-input");
    inputEl.removeAttribute('list');
    inputEl.type = "text";
    inputEl.parentNode.style.display = "flex";
    document.getElementById("colSelectValue").parentNode.style.display = "none";
    document.getElementById("ColValueLabel").innerText = col_name;

    if (dt_picker) {
        dt_picker.destroy();
        dt_picker = null;
    }

    if (col_name in column_formatters["autofiller"]) {
        inputEl.setAttribute("list", `${col_name}_dataList`);
        inputEl.parentNode.style.flex = 1;
    } else if (col_name in column_formatters["lov"]) {
        const selectEl = document.getElementById("colSelectValue");
        inputEl.parentNode.style.display = "none";
        selectEl.parentNode.style.display = "flex";
        selectEl.innerHTML = "";
        const lovVals = column_formatters["lov"][col_name];
        if (Array.isArray(lovVals) && lovVals.length > 0) {
            lovVals.forEach(val => {
                selectEl.appendChild(get_cl_element("option", null, null, document.createTextNode(val)));
            });
            selectEl.firstChild.setAttribute("selected", "");
        } else {
            inputEl.setAttribute("list", `${col_name}_dataList`);
        }
    } else if (col_name in column_formatters["decimals"]) {
        inputEl.type = "number";
    } else if (column_formatters["date"] && col_name in column_formatters["date"]) {
        inputEl.classList.add("datepicker-input");
        dt_picker = flatpickr(inputEl, {
            dateFormat: "Y-m-d H:i:S",
            allowInput: true
        });
    }

    document.getElementById("modal-update-column").classList.remove("hidden");
}

function get_dataList(id, options) {
    const datalist = document.createElement("datalist");
    datalist.id = id;
    for (const option of options) {
        const opt = document.createElement("option");
        opt.value = option;
        datalist.appendChild(opt);
    }
    return datalist;
}

function restore_values(tr) {
    const newRow = get_table_row(initial_row_values);
    tr.parentNode.replaceChild(newRow, tr);
    initial_row_values = [];
    current_row_id = 0;
}

function detect_changes(updated_row) {
    return JSON.stringify(updated_row) !== JSON.stringify(initial_row_values);
}

function get_table_row(row, selected_idx, select_all = false, page_num = 1) {
    const tr = get_cl_element("tr", "border-r hover:bg-gray-100");
    const tbl = table_el.querySelector("tbody");

    row.forEach((val, idx) => {
        let td;
        if (primary_column && idx === 0) {
            const input_el = get_cl_element("input", "input");
            input_el.type = "checkbox";
            input_el.checked = !!select_all;

            if (page_num > 1) {
                input_el.disabled = true;
            } else {
                input_el.onchange = function () {
                    const select_el = document.getElementById("selectAll");
                    if (!this.checked && select_el.checked) {
                        select_el.checked = false;
                    } else if (this.checked && !select_el.checked) {
                        select_el.checked = true;
                        for (const cn of tbl.querySelectorAll("input[type=checkbox]")) {
                            if (!cn.checked) {
                                select_el.checked = false;
                                break;
                            }
                        }
                    }
                };
            }

            td = get_cl_element("td", "px-3 py-2 text-center border-r", val, input_el);
        } else {
            if (val === null) {
                td = get_cl_element("td", "px-3 py-2 align-top border-r whitespace-normal");
            } else if (col_names[idx] in column_formatters["decimals"]) {
                td = get_cl_element("td", "px-3 py-2 align-top text-right border-r whitespace-normal");
                if (isNaN(val)) {
                    td.appendChild(document.createTextNode(val));
                    td.style.backgroundColor = "red";
                    td.setAttribute("title", "Expecting Numeric Value");
                } else {
                    td.appendChild(document.createTextNode(get_col_string(col_names[idx], val)));
                    td.setAttribute("title", val);
                }
            } else {
                td = get_cl_element("td", "px-4 py-2 align-top border-r whitespace-normal", null, document.createTextNode(val));
                td.setAttribute("title", val);
            }

            td.ondblclick = function () {
                if (editable_flag) {
                    if (current_row_id === 0) {
                        open_row(this);
                    } else if (current_row_id !== this.parentNode.firstChild.id) {
                        if (detect_changes(get_row_array(document.getElementById(current_row_id).parentNode))) {
                            confirmBox("Alert!", "You have unsaved changes");
                        } else {
                            restore_values(document.getElementById(current_row_id).parentNode);
                            open_row(this);
                        }
                    }
                }
            };
        }

        tr.appendChild(td);
    });

    if (selected_idx > 0 && selected_idx < row.length) {
        tr.childNodes[selected_idx].classList.add("selected_col");
    }

    return tr;
}


document.getElementById("formatColumn").onclick = function () {
    const selectedHeader = table_el.querySelector('thead .selected_col');
    if (!selectedHeader) {
        confirmBox("Alert!", "Please select a column");
        return;
    }

    const decimalPlaces = document.getElementById("decimalPlaces");
    const commaSeparator = document.getElementById("commaSeparator");
    const localeString = document.getElementById("localeString");
    const displayCurrency = document.getElementById("displayCurrency");
    const aggregateFunction = document.getElementById("aggregateFunction");
    const fieldType = document.getElementById("fieldType");
    const lovText = document.getElementById("lovText");
    const colName = selectedHeader.innerText;

    // Hide/show LOV input based on column type
    lovText.style.display = !(colName in column_formatters["decimals"]) ? '' : 'none';

    // Show all numeric formatting fields by default
    decimalPlaces.parentElement.style.display = '';
    commaSeparator.parentElement.style.display = '';
    localeString.parentElement.style.display = '';
    displayCurrency.parentElement.style.display = '';
    aggregateFunction.parentElement.style.display = '';
    fieldType.parentElement.style.display = 'none';

    // Field type options
    const options = {
        freetext: 'Free Text',
        autofiller: 'Auto Filler',
        date: 'Date',
        datetime: 'Date Time',
        lov: 'LOV',
        numeric: 'Numeric'
    };

    fieldType.innerHTML = '';

    // Populate fieldType dropdown
    if (colName in column_formatters["decimals"] && !(colName in column_formatters['date']) && !(colName in column_formatters['datetime'])) {
        fieldType.add(new Option(options.numeric, 'numeric'));
        fieldType.add(new Option(options.date, 'date'));
        fieldType.add(new Option(options.datetime, 'datetime'));
    } else {
        for (const key in options) {
            if (key !== 'numeric') {
                fieldType.add(new Option(options[key], key));
            }
        }
    }

    // Set fieldType and formatting values
    if (colName in column_formatters['date'] || colName in column_formatters['datetime']) {
        fieldType.add(new Option('Numeric', 'numeric'));
        fieldType.value = colName in column_formatters['datetime'] ? 'datetime' : 'date';
        lovText.style.display = 'none';
    } else if (colName in column_formatters["decimals"]) {
        fieldType.value = 'numeric';
        decimalPlaces.value = column_formatters["decimals"][colName];
        commaSeparator.value = column_formatters["comma"][colName];
        localeString.value = column_formatters["locale"][colName];
        displayCurrency.value = column_formatters["currency"][colName];
        aggregateFunction.value = column_formatters["aggregate"][colName];
    } else {
        let colVals = [];
        if (colName in column_formatters['lov']) {
            fieldType.value = 'lov';
            colVals = column_formatters['lov'][colName];
        } else if (colName in column_formatters['autofiller']) {
            fieldType.value = 'autofiller';
            colVals = column_formatters['autofiller'][colName];
        } else if (colName in column_formatters['date']) {
            fieldType.value = 'date';
            lovText.style.display = 'none';
        } else {
            fieldType.value = 'freetext';
            lovText.style.display = 'none';
        }

        if (column_formatters['query'] && colName in column_formatters['query']) {
            lovText.value = column_formatters['query'][colName];
            lovText.style.display = '';
        } else if (Array.isArray(colVals) && colVals.length > 0) {
            lovText.value = colVals.join(';');
            lovText.style.display = '';
        } else {
            lovText.value = '';
        }
    }

    document.getElementById('modal-format-column').classList.remove('hidden');
};

const fieldType = document.getElementById('fieldType');
const lovInnerText = document.getElementById('lovText');

fieldType.addEventListener('change', function (e) {
    // Hide all numeric formatting fields by default
    decimalPlaces.parentElement.style.display = 'none';
    commaSeparator.parentElement.style.display = 'none';
    localeString.parentElement.style.display = 'none';
    displayCurrency.parentElement.style.display = 'none';
    aggregateFunction.parentElement.style.display = 'none';

    const type = e.target.value;

    if (type === 'numeric') {
        lovInnerText.style.display = 'none';
        decimalPlaces.parentElement.style.display = '';
        commaSeparator.parentElement.style.display = '';
        localeString.parentElement.style.display = '';
        displayCurrency.parentElement.style.display = '';
        aggregateFunction.parentElement.style.display = '';
    } else if (type === 'date' || type === 'datetime' || type === 'freetext') {
        lovInnerText.style.display = 'none';
    } else {
        lovInnerText.style.display = '';
    }
});

document.getElementById("updateFormats").onclick = async function () {
    const col_name = table_el.querySelector('thead .selected_col').innerText;
    const n = parseInt(document.getElementById("decimalPlaces").value, 10);
    const aggregate = document.getElementById("aggregateFunction").value;
    const comma_flag = parseInt(document.getElementById("commaSeparator").value, 10);
    const fieldType = document.getElementById('fieldType').value;
    const lovInnerText = document.getElementById('lovText').value;
    let locale = document.getElementById("localeString").value;
    let currency = document.getElementById("displayCurrency").value;
    const parameter_dict = {};

    if (currency === "0") currency = 0;
    if (locale === "0") locale = 0;

    // Handle date/datetime
    if (fieldType === 'date' || fieldType === 'datetime') {
        ["decimals", "comma", "locale", "currency", "aggregate"].forEach(key => {
            if (col_name in column_formatters[key]) delete column_formatters[key][col_name];
        });
        parameter_dict["LOV"] = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
        ["lov", "autofiller", "query"].forEach(key => {
            if (col_name in column_formatters[key]) delete column_formatters[key][col_name];
        });
        if (col_name in column_formatters['date'] && fieldType !== 'date') delete column_formatters['date'][col_name];
        if (col_name in column_formatters['datetime'] && fieldType !== 'datetime') delete column_formatters['datetime'][col_name];
        column_formatters[fieldType][col_name] = 1;
    }
    // Handle autofiller
    else if (fieldType === 'autofiller') {
        if (lovInnerText) {
            parameter_dict["LOV"] = `Autofiller | ${lovInnerText}`;
            if (col_name in column_formatters['lov']) delete column_formatters['lov'][col_name];
            column_formatters['query'][col_name] = lovInnerText;
            let dl = document.getElementById(`${col_name}_dataList`);
            if (lovInnerText.trim().toLowerCase().startsWith("select")) {
                const result = await gm.runSelectQuery(modelName, lovInnerText);
                column_formatters["autofiller"][col_name] = result;
                if (dl) dl.remove();
                document.getElementById("dataList_div").appendChild(get_dataList(`${col_name}_dataList`, result));
            } else {
                const lov_list2 = lovInnerText.split(";").map(v => v.trim()).filter(Boolean);
                column_formatters["autofiller"][col_name] = lov_list2;
                if (dl) dl.remove();
                document.getElementById("dataList_div").appendChild(get_dataList(`${col_name}_dataList`, lov_list2));
            }
        }
    }
    // Handle LOV
    else if (fieldType === 'lov') {
        if (lovInnerText) {
            parameter_dict["LOV"] = `Select | ${lovInnerText}`;
            if (col_name in column_formatters['lov']) delete column_formatters['lov'][col_name];
            if (lovInnerText.trim().toLowerCase().startsWith("select")) {
                column_formatters["query"][col_name] = lovInnerText;
                const result = await gm.runSelectQuery(modelName, lovInnerText);
                column_formatters["lov"][col_name] = result;
            } else {
                const lov_list2 = lovInnerText.split(";").map(v => v.trim()).filter(Boolean);
                column_formatters["lov"][col_name] = lov_list2;
            }
        }
    }
    // Handle freetext
    else if (fieldType === 'freetext') {
        parameter_dict["LOV"] = 'Freetext';
        ["lov", "autofiller", "date", "datetime", "query"].forEach(key => {
            if (col_name in column_formatters[key]) delete column_formatters[key][col_name];
        });
    }
    // Handle numeric
    else {
        if (col_name_types[col_name] === 'NUMERIC') {
            ["lov", "autofiller", "date", "datetime", "query"].forEach(key => {
                if (col_name in column_formatters[key]) delete column_formatters[key][col_name];
            });
            parameter_dict["Decimals"] = n;
            parameter_dict["Comma"] = comma_flag;
            parameter_dict["Locale"] = locale;
            parameter_dict["Currency"] = currency;
            parameter_dict["Aggregate"] = aggregate;
            column_formatters["decimals"][col_name] = n;
            column_formatters["comma"][col_name] = comma_flag;
            column_formatters["locale"][col_name] = locale;
            column_formatters["currency"][col_name] = currency;
            column_formatters["aggregate"][col_name] = aggregate;
        } else {
            confirmBox('Alert', "You can't convert text column to Numeric.");
            return;
        }
    }

    document.getElementById('modal-format-column').classList.add('hidden');
    await gm.setTableFormatter(modelName, tableName, col_name, parameter_dict);

    table_el.querySelectorAll("td.selected_col").forEach(cn => {
        if (cn.firstChild && cn.firstChild.tagName !== "INPUT") {
            if (col_name in column_formatters["decimals"]) {
                const val = parseFloat(cn.getAttribute("title"));
                cn.innerText = get_col_string(col_name, val);
            } else {
                cn.innerText = cn.getAttribute("title");
            }
        }
    });
};

function get_col_string(col_name, col_val) {
    if (col_val == null || col_val === undefined) return "";

    const decimals = column_formatters["decimals"][col_name];
    const currency = column_formatters["currency"][col_name];
    const comma = column_formatters["comma"][col_name];
    const locale = column_formatters["locale"][col_name];

    const options = {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: !!comma
    };

    if (currency) {
        options.style = "currency";
        options.currency = currency;
    }

    return Number(col_val).toLocaleString(locale, options);
}

function get_row_array(tr) {
    const updated_row = [];
    const header_row = table_el.querySelector("tr.headers").childNodes;

    tr.childNodes.forEach((cn, idx) => {
        if (idx === 0) {
            updated_row.push(cn.id);
            return;
        }

        let col_val = cn.firstChild.value;
        if (cn.firstChild.classList.contains("awesomplete")) {
            col_val = cn.firstChild.firstChild.value;
        }

        const col_name = col_names[idx];

        // Numeric validation
        if (col_name in column_formatters["decimals"] && isNaN(col_val)) {
            confirmBox("Alert!", `Please enter numeric value in ${col_name} Column`);
            return;
        }

        // Not null validation
        if (col_val.trim() === "" && header_row[idx].querySelector("u")) {
            confirmBox("Alert!", `Please enter not null value in ${col_name} Column`);
            return;
        }

        // Date formatting
        if (column_formatters["date"] && col_name in column_formatters["date"]) {
            const parts = col_val.split(' ');
            if (parts[1] === '00:00:00') {
                col_val = parts[0];
            }
        }

        // Null handling
        if (col_val.trim() === "") {
            col_val = null;
        } else if (col_val.trim() === "null" && col_name in column_formatters["lov"]) {
            col_val = null;
        } else if (col_name in column_formatters["decimals"]) {
            col_val = parseFloat(col_val);
        }

        updated_row.push(col_val);
    });

    return updated_row;
}

document.getElementById("ok-query").onclick = async () => {
    const queryInput = document.getElementById("queryInput");
    const viewQuery = queryInput.value.trim();
    if (!viewQuery) {
        confirmBox("Alert!", "Please enter a query");
        return;
    }

    await fetchData('home', 'checkOrCreateView', {
        view_name: tableName,
        view_query: viewQuery,
        model_name: modelName,
        isExist: true
    });

    queryInput.value = viewQuery;
    document.getElementById('modal-get-viewQuery').classList.add('hidden');
    await init();
    confirmBox("Success", "View updated successfully");
};

function hide_sidebar() {
    const sidebarDiv = document.getElementById("sidebarDiv");
    const sidebarBtn = document.getElementById("sidebarBtn");
    const mainDiv = document.getElementById("mainDiv");

    if (sidebarDiv.style.width !== "600px") {
        sidebarDiv.style.width = "600px";
        sidebarBtn.style.marginRight = "599px";
        mainDiv.style.marginRight = "589px";
        set_editor_value(view_query);
    } else {
        sidebarDiv.style.width = "0";
        sidebarBtn.style.marginRight = "0";
        mainDiv.style.marginRight = "-12px";
    }
}

async function run_editor_query() {
    let query = editor.getValue();
    if (document.getElementById("editorDiv").style.display === "none") {
        query = get_query_text();
    }
    if (!query.trim()) {
        confirmBox("Alert!", "Please write a query");
        return;
    }

    const result = await gm.runEditorQuery(tableName, query, modelName);
    const msgEl = document.getElementById("solutionMsg");
    view_query = query;

    if (result.includes('SQLError')) {
        msgEl.style.color = "red";
    } else {
        msgEl.style.color = "";
        document.getElementById("data-loader").style.display = "";
        await init();
    }
    msgEl.innerText = result;
}

async function get_table_rows() {
    const bodyDiv = document.getElementById("logTable").querySelector('tbody');
    bodyDiv.innerHTML = "";

    const [rows] = await gm.fetchTableData(modelName, 'T_QueryLogs', ['LogTime', 'QuerySQL', 'QueryMsg']);
    rows.slice().reverse().forEach(row => {
        bodyDiv.appendChild(get_log_row(row));
    });
}

function get_log_row(row) {
    const bodyDiv = document.getElementById("logTable").querySelector('tbody');
    const tr = get_cl_element("tr");
    row.forEach((value, idx) => {
        const td = value ? get_cl_element("td", null, null, document.createTextNode(value)) : get_cl_element("td");
        if (idx === 1 && value) {
            tr.setAttribute("row_query", value);
            tr.setAttribute("title", value);
        }
        tr.appendChild(td);
    });

    tr.onclick = () => {
        bodyDiv.querySelectorAll("tr.selected").forEach(selectedTr => selectedTr.classList.remove("selected"));
        tr.classList.add("selected");
    };

    return tr;
}

document.getElementById('logButton').onclick = function () {
    const editorDiv = document.getElementById("editorDiv");
    const logtableDiv = document.getElementById("logtableDiv");
    const copyBtn = document.getElementById("copyBtn");
    if (editorDiv.style.display !== "none") {
        editorDiv.style.display = "none";
        logtableDiv.style.display = "";
        copyBtn.style.display = "";
    } else {
        editorDiv.style.display = "";
        logtableDiv.style.display = "none";
        copyBtn.style.display = "none";
    }
};

function get_editor() {
    const editorDiv = document.getElementById("editorDiv");
    const logtableDiv = document.getElementById("logtableDiv");
    const editorButton = document.getElementById("editor-button");
    const copyBtn = document.getElementById("copyBtn");
    if (editorDiv.style.display === "none") {
        editorDiv.style.display = "";
        logtableDiv.style.display = "none";
        editorButton.disabled = false;
        copyBtn.style.display = "none";
    }
}

function set_editor_value(text) {
    editor.setValue(text);
    setTimeout(() => {
        editor.refresh();
        editor.focus();
    }, 200);
}

document.getElementById("copyBtn").onclick = () => {
    const text = get_query_text();
    if (text) {
        navigator.clipboard.writeText(text);
        set_editor_value(text);
        get_editor();
    }
};

function get_query_text() {
    const tbody = document.getElementById("logTable").querySelector('tbody');
    const selectedRow = tbody.querySelector(".selected");
    if (selectedRow) {
        return selectedRow.getAttribute('row_query');
    } else {
        confirmBox("Alert!", "No row selected");
        return "";
    }
}

document.getElementById("copyTable").onclick = async () => {
    document.getElementById("data-loader").style.display = "";
    const data = await gm.fetchTableData(modelName, tableName, col_names, {}, {}, {}, 1, [], false);
    document.getElementById("data-loader").style.display = "none";
    if (data[1] > 100000) {
        confirmBox("Alert!", "Sorry! , Data exceeded maximum Limit");
        return;
    }
    copyArrayToClipboard(data[0]);
};

function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        console.log("Clipboard API not available");
        return;
    }
    navigator.clipboard.writeText(text)
        .then(() => {
            document.getElementById("data-loader").style.display = "none";
            confirmBox('Success', 'Copied to clipboard');
        })
        .catch(err => {
            document.getElementById("data-loader").style.display = "none";
            confirmBox('Alert!', `Error occurred: ${err}`);
        });
}

function copyArrayToClipboard(array) {
    const csv = array.map(row =>
        row.map(cell => (cell + '').replace(/[\n\t]+/g, ' ')).join('\t')
    ).join('\n');
    copyTextToClipboard(csv);
}

function add_insert_row() {
    const tr = get_cl_element("tr", "insert");
    for (let idx = 0; idx < col_names.length; idx++) {
        const col_name = col_names[idx];
        let td = document.createElement("td");
        tr.appendChild(td);

        if (idx === 0) {
            td.id = 0;
            continue;
        }

        let input_el;
        let autofill_flag = false;

        if (col_name in column_formatters["lov"] && column_formatters["lov"][col_name].toLowerCase() !== 'freetext') {
            input_el = get_cl_element("select", "select p-1", null);
            column_formatters["lov"][col_name].forEach(opt_val => {
                input_el.appendChild(get_cl_element("option", null, null, document.createTextNode(opt_val)));
            });
        } else if (col_name in column_formatters["autofiller"]) {
            input_el = get_cl_element("input", "input p-1", null);
            autofill_flag = true;
        } else if (col_name in column_formatters["decimals"]) {
            input_el = get_cl_element("input", "input p-1", null);
            input_el.type = "number";
        } else if (column_formatters["date"] && col_name in column_formatters["date"]) {
            input_el = get_cl_element("input", "input datepicker-input p-1", null);
            dt_picker = flatpickr(input_el, {
                dateFormat: "Y-m-d H:i:S",
                allowInput: true
            });
            input_el.type = "text";
        } else {
            input_el = get_cl_element("input", "input p-1", null);
            input_el.type = "text";
        }

        input_el.addEventListener("keydown", function (e) {
            if (e.keyCode === 27) {
                Array.from(this.parentNode.parentNode.childNodes).forEach(cn => {
                    const inp_el = cn.firstChild;
                    if (inp_el && inp_el.classList.contains("form-ctrl")) {
                        inp_el.value = "";
                    }
                });
            } else if (e.keyCode === 13) {
                insert_row(this.parentNode.parentNode);
                e.preventDefault();
            }
        });

        td.appendChild(input_el);

        if (autofill_flag) {
            input_el.setAttribute("list", `${col_name}_dataList`);
        }
    }
    return tr;
}
