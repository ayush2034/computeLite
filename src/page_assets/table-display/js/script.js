import { get_cl_element, confirmBox, executeQuery } from "../../../assets/js/scc"
import * as gm from "../../../core/gridMethods"
// import * as bootstrap from 'bootstrap'
import flatpickr from "flatpickr"
import 'flatpickr/dist/flatpickr.min.css'
import Sortable from "sortablejs"

const page_element = document.getElementById("currentPage")
const table_el = document.getElementById("displayTable")
const rec_per_page = 1000

var primary_column = false
var where_in = new Object
var where_not_in = new Object
var like_query = new Object
var sort_columns = []
var column_formatters = new Object
let col_name_types = {}
var editable_flag
var currentPage = 1
var col_names
var initial_row_values = []
var current_row_id = 0
let running_model = null;
var sort_col_names = {};
const params = new URLSearchParams(window.location.search)

const modelName = params.get('modelName');
const tableName = params.get('tableName');
if (tableName) {
    document.title = tableName
    document.getElementById("table_name").innerText = tableName
}

let parameters = {};
let dt_picker = null;

let freeze_col_num;

get_parameters();

window.addEventListener("DOMContentLoaded", async () => {
    const result = await executeQuery('init');
    if (result && result.msg === 'Success') {
        await init();
    }

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
    const selectedColumnEl = document.getElementById("selectedColumn");
    const availableColumnEl = document.getElementById("availableColumn");
    document.getElementById("resetSort").onclick = reset_sort;

    Sortable.create(selectedColumnEl, { group: "words", animation: 150 });
    Sortable.create(availableColumnEl, { group: "words", animation: 150 });

    const result = await gm.fetchTableFormatter(modelName, tableName);
    column_formatters = result[0][0];
    freeze_col_num = result[0][2];

    if (result[0][1]) {
        document.getElementById("viewQuery").style.display = "";
        document.getElementById("queryInput").value = result[0][1];
    }

    if (result[1]) {
        editable_flag = true;
        table_el.classList.add("no_user_select");
    }

    await get_sort();
    await get_columns();

    if (!editable_flag) {
        document.getElementById("deleteRecordsBtn").style.display = "none";
        document.getElementById("excelUploadBtn").style.display = "none";
        document.getElementById("addNewColBtn").style.display = "none";
        document.getElementById("delNewColBtn").style.display = "none";
        document.getElementById("multiUpdate").style.display = "none";
    }
}

async function get_table_headers(header_rows) {
    await update_column_formatters(header_rows);
    col_names = header_rows.map(row => row[0]);
    primary_column = header_rows[0][1].toLowerCase() === "primary";
    get_table_data(col_names);

    const tbl = table_el.querySelector("thead");
    tbl.className = "bg-card";
    tbl.innerHTML = "";

    const tr1 = get_cl_element("tr", "headers border-r");
    const tr2 = get_cl_element("tr", "lovRow border-b bg-card");

    for (let i = 0; i < header_rows.length; i++) {
        const hd = header_rows[i];
        col_name_types[hd[0]] = hd[1];

        // Header cell
        const th = get_cl_element("th", "px-3 py-2 font-medium text-card-foreground text-left");
        th.setAttribute("nowrap", "");
        if (i < freeze_col_num) {
            th.classList.add('ZDX_H', `C${i}`);
        }

        // Dropdown menu for filter
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

        // Dropdown content
        const dropdown = get_cl_element("div", "min-w-56");
        dropdown.setAttribute("data-popover", "");
        dropdown.setAttribute("aria-hidden", "true");

        const role_menu = get_cl_element("div");
        role_menu.setAttribute("role", "menu");
        role_menu.setAttribute("aria-labelledby", "demo-dropdown-menu-trigger");

        // Select All
        const select_all_label = get_cl_element("label",
            "flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded",
            null, get_cl_element("input", "mr-2 input"));
        select_all_label.querySelector("input").type = "checkbox";
        select_all_label.appendChild(document.createTextNode("Select All"));
        role_menu.appendChild(select_all_label);

        role_menu.appendChild(get_cl_element("div", "border-t my-2"));

        // LOV values
        const lov_container = get_cl_element("div", "lov-values max-h-40 overflow-y-auto space-y-1 grid");
        role_menu.appendChild(lov_container);

        role_menu.appendChild(get_cl_element("div", "border-t my-2"));

        // Buttons
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

        // Toggle dropdown and fetch LOV values
        toggle_btn.addEventListener("click", async function () {
            const isHidden = dropdown.getAttribute("aria-hidden") === "true";
            dropdown.setAttribute("aria-hidden", (!isHidden).toString());

            if (isHidden) {
                const lov_div = th2.querySelector("div.lov-values");
                where_in[hd[0]] = where_in[hd[0]] || [];
                where_not_in[hd[0]] = where_not_in[hd[0]] || [];
                if (where_in[hd[0]].length === 0 && where_not_in[hd[0]].length === 0) {
                    lov_div.parentNode.querySelector("input").checked = true;
                }
                lov_div.innerHTML = "";
                let temp_where_in = { ...where_in };
                let temp_where_not_in = { ...where_not_in };
                delete temp_where_in[hd[0]];
                delete temp_where_not_in[hd[0]];
                document.getElementById("data-loader").style.display = "";

                const result = await gm.fetchTableData(modelName, tableName, [hd[0]], temp_where_in, temp_where_not_in, like_query, 1, [], true, true);

                document.getElementById("data-loader").style.display = "none";
                const total_len = result[0].length;
                for (let col_value of result[0]) {
                    let el = get_cl_element("a", "flex items-center px-2 py-0.5 cursor-pointer hover:bg-gray-100 rounded",
                        null, get_cl_element("input", "input mr-2"));
                    el.firstChild.type = "checkbox";
                    let valStr = col_value[0] !== null ? col_value[0].toString() : "null";
                    if (where_in[hd[0]].length > 0) {
                        if (where_in[hd[0]].includes(valStr)) el.firstChild.checked = true;
                    } else if (where_not_in[hd[0]].length > 0) {
                        if (!where_not_in[hd[0]].includes(valStr)) el.firstChild.checked = true;
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
                            if (ct === total_len) {
                                lov_div.parentNode.querySelector("input").checked = true;
                            }
                        }
                    };
                }
                const ct = lov_div.querySelectorAll("input:checked").length;
                if (ct === total_len) {
                    lov_div.parentNode.querySelector("input").checked = true;
                }
            }
        });

        // Select All propagation
        select_all_label.querySelector("input").addEventListener("change", function (e) {
            lov_container.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = e.target.checked;
            });
        });

        // Keyboard navigation in dropdown
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
                    submit_lov_button(th2, hd[0]);
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

        // Ok button: filter icon toggle
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
            submit_lov_button(th2, hd[0]);
            dropdown.setAttribute("aria-hidden", "true");
            toggle_btn.setAttribute("aria-expanded", "false");
        });

        // Clear button
        ter_button.addEventListener("mousedown", function () {
            let flag = false;
            if (where_in[hd[0]].length > 0) {
                flag = true;
                where_in[hd[0]] = [];
            } else if (where_not_in[hd[0]].length > 0) {
                flag = true;
                where_not_in[hd[0]] = [];
            }
            if (flag) get_table_data(col_names);
            setTimeout(function () {
                const icon = toggle_btn.querySelector("span");
                if (icon && icon.childNodes[1]) {
                    icon.removeChild(icon.childNodes[0]);
                    icon.firstChild.style = "";
                }
            }, 200);
            dropdown.setAttribute("aria-hidden", "true");
            toggle_btn.setAttribute("aria-expanded", "false");
        });

        let icon_class = get_icon_class(hd[0]);

        if (primary_column && i === 0) {
            let el = get_cl_element("input", "input", "selectAll");
            el.type = "checkbox";
            th.appendChild(el);
            th.id = hd[0];
            tr2.appendChild(get_cl_element("th", 'ZDX_H'));
            el.onchange = function () {
                for (let tr of table_el.querySelectorAll("tbody tr")) {
                    if (tr.firstChild.firstChild) {
                        tr.firstChild.firstChild.checked = el.checked;
                    }
                }
            };
        } else if (hd[2] === 1) {
            th.classList.add("min-width", "font-semibold");
            let el = get_cl_element("u", null, null, document.createTextNode(hd[0]));
            el.appendChild(get_cl_element("span", `fa ${icon_class}`));
            th.appendChild(el);
            tr2.appendChild(th2);
        } else {
            th.classList.add("min-width", "font-semibold");
            th.appendChild(document.createTextNode(hd[0]));
            th.appendChild(get_cl_element("span", `fa ${icon_class}`));
            tr2.appendChild(th2);
        }

        if (i < freeze_col_num) {
            th2.classList.add('ZDX_H', `C${i}`);
        }

        const sort_el = th.querySelector(`span.${icon_class}`);
        if (sort_el) {
            sort_el.addEventListener('click', function () {
                const sort_cols = sort_columns.map(sc => sc[0]);
                let idx = sort_cols.indexOf(hd[0]);
                if (idx < 0) idx = sort_cols.length;
                if (this.classList.contains("fa-sort-down")) {
                    sort_columns[idx] = [hd[0], "desc"];
                    this.classList.remove("fa-sort-down");
                    this.classList.add("fa-sort-up");
                } else {
                    this.classList.remove("fa-sort-up", "fa-sort");
                    this.classList.add("fa-sort-down");
                    sort_columns[idx] = [hd[0], "asc"];
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
    let select_all = false;
    if (primary_column && document.getElementById("selectAll")) {
        select_all = document.getElementById("selectAll").checked;
    }

    const selected_header = table_el.querySelector('thead .selected_col');
    let selected_idx = 0;
    if (selected_header) {
        selected_idx = col_names.indexOf(selected_header.firstChild.textContent);
    }

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

    freeze_headers();

    if (editable_flag) {
        tbl.appendChild(add_insert_row());
    }

    if (data[0].length > -5) {
        const tr = get_cl_element("tr", "footer");
        for (const _ of col_names) {
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

    let inner_text, total_pages;
    if (data_count >= rec_per_page) {
        inner_text = `${(page_num - 1) * rec_per_page + 1}-${Math.min(page_num * rec_per_page, data_count)} of ${data_count}`;
        total_pages = `of ${parseInt(data_count / rec_per_page) + 1}`;
    } else {
        inner_text = `1-${data_count} of ${data_count}`;
        total_pages = "of 1";
    }

    document.getElementById("totalRecordsPanel").innerText = inner_text;
    page_element.parentNode.childNodes[2].textContent = total_pages;
    page_element.setAttribute("maxPages", parseInt(data_count / rec_per_page) + 1);
    page_element.value = currentPage;
}

function not_eq_list(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return true;
    return a.some(item => !b.includes(item)) || b.some(item => !a.includes(item));
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
        let page_val = parseInt(page_element.value);
        const max_page_num = parseInt(page_element.getAttribute("maxPages"));
        if (isNaN(page_val)) {
            page_element.value = currentPage;
        } else {
            page_val = Math.max(1, Math.min(page_val, max_page_num));
            page_element.value = page_val;
            if (page_val !== currentPage) {
                get_table_data(col_names, page_val);
            }
        }
    }
});

document.getElementById("firstPageBtn").onclick = function () {
    if (currentPage > 1) {
        page_element.value = 1;
        get_table_data(col_names, 1);
    }
};

document.getElementById("prevPageBtn").onclick = function () {
    if (currentPage > 1) {
        page_element.value = currentPage - 1;
        get_table_data(col_names, currentPage - 1);
    }
};

document.getElementById("nextPageBtn").onclick = function () {
    const max_page_num = parseInt(page_element.getAttribute("maxPages"));
    if (currentPage < max_page_num) {
        page_element.value = currentPage + 1;
        get_table_data(col_names, currentPage + 1);
    }
};

document.getElementById("lastPageBtn").onclick = function () {
    const max_page_num = parseInt(page_element.getAttribute("maxPages"));
    if (currentPage < max_page_num) {
        page_element.value = max_page_num;
        get_table_data(col_names, max_page_num);
    }
};

document.getElementById("refreshBtn").onclick = function (e) {
    const svg = e.currentTarget.firstElementChild;
    if (svg) {
        // Get current rotation angle
        let currentRotation = svg.getAttribute("data-rotation") || "0";
        let newRotation = parseInt(currentRotation, 10) + 360;
        svg.style.transition = "transform 0.6s";
        svg.style.transform = `rotate(${newRotation}deg)`;
        svg.setAttribute("data-rotation", newRotation);
    }
    get_sort().then(reload_table_data);
};

function reload_table_data() {
    reset_sort_buttons();
    where_in = {};
    where_not_in = {};
    like_query = {};
    const selectAllEl = document.getElementById("selectAll");
    if (selectAllEl) selectAllEl.checked = false;
    get_table_data(col_names, 1);

    table_el.querySelectorAll(".lovRow input.form-ctrl").forEach(input => input.value = "");
    const tbl = table_el.querySelector("thead");
    tbl.querySelectorAll("button.group-text").forEach(filter => {
        if (filter.childNodes[1]) {
            filter.removeChild(filter.childNodes[0]);
            filter.firstChild.style = "";
        }
    });
}

function reset_sort_buttons() {
    // Reset all sort icons in the table header
    table_el.querySelectorAll("thead span.fa-sort-down, thead span.fa-sort-up, thead span.fa-sort").forEach(span => {
        const colName = span.parentNode.innerText.trim();
        if (sort_col_names[colName] === "asc") {
            span.classList.remove("fa-sort", "fa-sort-up");
            span.classList.add("fa-sort-down");
        } else if (sort_col_names[colName] === "desc") {
            span.classList.remove("fa-sort", "fa-sort-down");
            span.classList.add("fa-sort-up");
        } else {
            span.classList.remove("fa-sort-down", "fa-sort-up");
            span.classList.add("fa-sort");
        }
    });

    // Remove selected_col class from all header cells
    table_el.querySelectorAll("th.selected_col").forEach(th => {
        th.classList.remove("selected_col");
    });
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

document.getElementById("excelDownloadBtn").onclick = async function () {
    const loader = document.getElementById("data-loader");
    loader.style.display = "";
    try {
        await gm.downloadExcel(modelName, [tableName]);
    } finally {
        loader.style.display = "none";
    }
};

document.getElementById("importExcel").onclick = async function (e) {
    const fileInput = document.getElementById("fileUpload");
    const loader = document.getElementById("data-loader");

    if (!fileInput.files.length) {
        confirmBox('Alert!', 'Please choose a file to upload');
        return;
    }

    loader.style.display = "";
    try {
        const file = await fileInput.files[0].arrayBuffer();
        const data = await gm.uploadExcel(modelName, [tableName.toLowerCase()], file);

        const sheetNames = Object.keys(data);
        const idx = sheetNames.findIndex(name => name.toLowerCase() === tableName.toLowerCase());

        if (idx !== -1) {
            const result = data[sheetNames[idx]];
            if (typeof result === "string") {
                if (result === "Only header inserted") {
                    confirmBox("Success!", result);
                } else {
                    confirmBox(result.startsWith("No") ? "Error!" : "Error!", result);
                }
            } else if (typeof result === "number") {
                if (result > 0) {
                    reload_table_data();
                    confirmBox("Success!", `Total Rows: ${result} Imported`);
                } else {
                    confirmBox("Info", "No row inserted");
                }
            } else {
                confirmBox("Error!", "Unexpected result from import");
            }
        } else {
            confirmBox("Error!", "No sheet matches with table name");
        }
    } finally {
        loader.style.display = "none";
        document.getElementById('modal-file-upload').classList.add('hidden');
    }
};



async function update_column_formatters(header_rows) {
    const numeric_types = ['NUMERIC', 'INTEGER'];
    const default_formatters = { decimals: 2, comma: 0, locale: 0, currency: 0, aggregate: 'SUM' };
    const ncf = {};

    // Initialize formatters for numeric columns
    for (const format in default_formatters) {
        ncf[format] = {};
        for (const [col_name, col_type] of header_rows.map(r => [r[0], r[1]])) {
            if (numeric_types.includes(col_type)) {
                let value = column_formatters[format]?.[col_name];
                if (value !== undefined) {
                    if (!isNaN(value) && parseInt(value) > -1) {
                        ncf[format][col_name] = parseInt(value);
                    } else if (['locale', 'currency', 'aggregate'].includes(format)) {
                        ncf[format][col_name] = value;
                    } else {
                        ncf[format][col_name] = default_formatters[format];
                    }
                } else {
                    ncf[format][col_name] = (format === 'decimals' && col_type === 'INTEGER') ? 0 : default_formatters[format];
                }
            }
        }
    }

    col_names = header_rows.map(r => r[0]);
    for (const format in default_formatters) {
        column_formatters[format] = ncf[format];
    }

    // Ensure required formatter objects exist
    ['autofiller', 'query', 'lov'].forEach(key => {
        if (!(key in column_formatters)) column_formatters[key] = {};
    });
    column_formatters.date = {};
    column_formatters.datetime = {};

    // Process LOV, Autofiller, Date, Datetime formatters
    for (const col_name of Object.keys(column_formatters.lov)) {
        const col_idx = col_names.indexOf(col_name);
        if (col_idx > -1 && !Array.isArray(column_formatters.lov[col_name])) {
            const lov_list = column_formatters.lov[col_name].split('|');
            const proper_col_name = header_rows[col_idx][0];
            const type = lov_list[0].trim().toLowerCase();
            const value = lov_list[1]?.trim();

            if (type === 'select') {
                if (value && value.toLowerCase().startsWith('select')) {
                    delete column_formatters.lov[col_name];
                    const query = lov_list.slice(1).join('_').trim();
                    column_formatters.query[proper_col_name] = query;
                    const result = await gm.runSelectQuery(modelName, query);
                    column_formatters.lov[proper_col_name] = result;
                } else if (value) {
                    const lov_values = value.split(';').map(v => v.trim()).filter(v => v.length > 0);
                    delete column_formatters.lov[col_name];
                    column_formatters.lov[proper_col_name] = lov_values;
                }
            } else if (type === 'autofiller') {
                if (value && value.toLowerCase().startsWith('select')) {
                    delete column_formatters.lov[col_name];
                    const query = lov_list.slice(1).join('|').trim();
                    column_formatters.query[proper_col_name] = query;
                    const result = await gm.runSelectQuery(modelName, query);
                    column_formatters.autofiller[proper_col_name] = result;
                    document.getElementById("dataList_div").appendChild(get_dataList(`${proper_col_name}_dataList`, result));
                    const insert_row_el = table_el.querySelector('tbody .insert');
                    if (insert_row_el) {
                        insert_row_el.remove();
                        table_el.querySelector('tbody').appendChild(add_insert_row());
                    }
                } else if (value) {
                    const autofill_values = value.split(';').map(v => v.trim()).filter(v => v.length > 0);
                    delete column_formatters.lov[col_name];
                    column_formatters.autofiller[proper_col_name] = autofill_values;
                    const dl = document.getElementById(`${proper_col_name}_dataList`);
                    if (dl) dl.remove();
                    document.getElementById("dataList_div").appendChild(get_dataList(`${proper_col_name}_dataList`, autofill_values));
                }
            } else if (type === 'date') {
                delete column_formatters.lov[col_name];
                column_formatters.date[proper_col_name] = 1;
            } else if (type === 'datetime') {
                delete column_formatters.lov[col_name];
                column_formatters.datetime[proper_col_name] = 1;
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
    const n = column_formatters["decimals"][colName] - 1;
    if (n > -1) {
        column_formatters["decimals"][colName] = n;
        await gm.setTableFormatter(modelName, tableName, colName, { "Decimals": n });
        table_el.querySelectorAll("td.selected_col").forEach(td => {
            const val = parseFloat(td.getAttribute("title"));
            if (!isNaN(val)) td.innerText = get_col_string(colName, val);
        });
    }
};

document.getElementById("showSummaryBtn").onclick = async function () {
    const numericColumns = Object.keys(column_formatters["decimals"]);
    const tfoot = table_el.querySelector("tr.footer");

    if (numericColumns.length === 0) return;

    if (tfoot.classList.contains("hidden")) {
        document.getElementById("data-loader").style.display = "";
        const summaryData = await gm.getSummary(modelName, tableName, numericColumns, where_in, where_not_in, like_query);
        document.getElementById("data-loader").style.display = "none";

        numericColumns.forEach((colName, i) => {
            let startIdx = editable_flag ? 1 : 0;
            const colIdx = col_names.indexOf(colName, startIdx);
            const value = summaryData[i];
            const cell = tfoot.childNodes[colIdx];
            cell.innerText = get_col_string(colName, value);
            cell.setAttribute("title", value);
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

function move_elements(type, sourceId, targetId) {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);

    if (type === "all") {
        Array.from(source.querySelectorAll("li")).forEach(li => {
            target.appendChild(li);
        });
    } else if (type === "one") {
        Array.from(source.querySelectorAll("li.selectedValue")).forEach(li => {
            target.appendChild(li);
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

function populate_columns(available_column, selected_column) {
    const availableColEl = document.getElementById("availableColumn");
    const selectedColEl = document.getElementById("selectedColumn");

    availableColEl.innerHTML = "";
    selectedColEl.innerHTML = "";

    available_column.forEach(col => {
        availableColEl.appendChild(get_li_element(col));
    });

    selected_column.forEach(col => {
        selectedColEl.appendChild(get_li_element(col));
    });
}


function get_li_element(col_name) {
    const li = get_cl_element("li", "dropzone", null, document.createTextNode(col_name));
    li.setAttribute("draggable", "true");

    li.onclick = function (e) {
        if (!e.ctrlKey) {
            this.parentNode.querySelectorAll("li.selectedValue").forEach(el => el.classList.remove("selectedValue"));
        }
        this.classList.add("selectedValue");
        e.preventDefault();
    };

    li.ondblclick = function () {
        const targetId = this.parentNode.getAttribute("dest");
        if (targetId) {
            document.getElementById(targetId).appendChild(this);
            this.classList.remove("selectedValue");
        }
    };

    return li;
}


async function get_columns() {
    const data = await gm.fetchColumnsData(modelName, tableName);
    if (!data.length || !data[1].length) {
        confirmBox("Alert!", `No table exists with tablename ${tableName}`);
        return;
    }

    get_table_headers(data[1]);

    let selected_column = editable_flag
        ? data[1].map(row => row[0]).slice(1)
        : data[1].map(row => row[0]);

    populate_columns(data[0], selected_column);

    const removeColumnEl = document.getElementById("removeColumnSelect");
    removeColumnEl.innerHTML = "";

    const defaultOption = get_cl_element("option", null, null, document.createTextNode("Select a Column to Remove"));
    defaultOption.value = 0;
    defaultOption.selected = true;
    removeColumnEl.appendChild(defaultOption);

    data[1].forEach((row, idx) => {
        const [colName, colType, isPrimary, isRequired] = row;
        if (colType !== 'PRIMARY' || isPrimary !== 1 || isRequired !== 1) {
            const option = get_cl_element("option", null, null, document.createTextNode(colName));
            removeColumnEl.appendChild(option);
        }
    });

    data[0].forEach(colName => {
        const option = get_cl_element("option", null, null, document.createTextNode(colName));
        removeColumnEl.appendChild(option);
    });
}

document.getElementById("saveColumnSelection").onclick = async function () {
    const selectedColumnEls = document.getElementById("selectedColumn").childNodes;
    const selectedColumns = Array.from(selectedColumnEls).map(li => li.innerText);

    const updateResult = await gm.updateColumnOrders(modelName, tableName, selectedColumns);
    if (updateResult) {
        await get_columns();
    }

    document.getElementById('modal-select-column').classList.add('hidden');
};

document.getElementById("addNewColBtn").onclick = function () {
    const newColNameInput = document.getElementById("newColName");
    const addColumnSelect = document.getElementById("addColumnSelect");
    const modalAddColumn = document.getElementById('modal-add-column');

    newColNameInput.value = "";
    addColumnSelect.value = "0";
    modalAddColumn.classList.remove('hidden');
};

document.getElementById("addNewColumn").onclick = async function () {
    const newColName = document.getElementById("newColName").value.trim();
    const colType = document.getElementById("addColumnSelect").value;
    const invalidChars = "*|,\":<>[]{} `\';()@&$#%";
    const allCols = [...col_names];

    if (!newColName) {
        confirmBox("Alert!", "Please Enter Column Name");
        return;
    }
    if (newColName.length > 50) {
        confirmBox("Alert!", "Please Enter Column Name up to 50 characters");
        return;
    }
    if ([...newColName].some(c => invalidChars.includes(c))) {
        confirmBox("Alert!", "Please remove special characters from column name");
        return;
    }
    if (colType == 0) {
        confirmBox("Alert!", "Please Select valid column type");
        return;
    }

    document.getElementById("availableColumn").childNodes.forEach(cn => {
        allCols.push(cn.innerText);
    });

    if (allCols.includes(newColName)) {
        confirmBox("Alert!", "Column name already exists, please choose another name");
        return;
    }

    const result = await gm.addNewColumn(modelName, tableName, newColName, colType);
    if (result) {
        get_columns();
        document.getElementById('modal-add-column').classList.add('hidden');
    }
};


document.getElementById("removeColumn").onclick = async function () {
    const selectEl = document.getElementById("removeColumnSelect");
    const col_name = selectEl.value;
    if (col_name === "0") {
        confirmBox("Alert!", "Please select a column to proceed");
        return;
    }

    try {
        const result = await gm.deleteColumn(modelName, tableName, col_name);
        if (result && result.message === "Success") {
            await get_columns();
        } else {
            confirmBox("Alert!", result?.message || "Failed to remove column");
        }
    } catch (err) {
        confirmBox("Error!", err.message || "Unexpected error occurred");
    } finally {
        document.getElementById('modal-remove-column').classList.add('hidden');
    }
};

document.getElementById("delNewColBtn").onclick = async function () {
    const selectedHeader = table_el.querySelector('thead .selected_col');
    if (selectedHeader) {
        const colIndex = col_names.indexOf(selectedHeader.firstChild.textContent);
        // Remove the column from all table rows
        table_el.querySelectorAll("tr").forEach(tr => {
            if (tr.childNodes[colIndex]) tr.childNodes[colIndex].remove();
        });
        // Remove from col_names
        col_names.splice(colIndex, 1);
        // Move the corresponding <li> from selectedColumn to availableColumn
        const selectedColumnList = document.getElementById("selectedColumn");
        const liEl = selectedColumnList.childNodes[colIndex - 1];
        document.getElementById("availableColumn").appendChild(liEl);
        // Update column order (excluding primary column)
        const selectedColumns = col_names.slice(1);
        await gm.updateColumnOrders(modelName, tableName, selectedColumns);
    } else {
        document.getElementById('modal-remove-column').classList.remove('hidden');
    }
};

async function delete_all_rows(e) {
    const [in_flag, rowid_list] = get_selected_rows();
    const result = await gm.deleteRows(
        modelName,
        tableName,
        where_in,
        where_not_in,
        like_query,
        rowid_list,
        in_flag,
        document.getElementById("selectAll").parentNode.id
    );
    if (result) {
        reload_table_data();
        confirmBox("Success!", `Total of ${result} rows deleted`);
    }
}

document.getElementById("deleteRecordsBtn").onclick = function (e) {
    if (!editable_flag) return;

    const selectAllChecked = document.getElementById("selectAll").checked;
    const tbody = table_el.querySelector("tbody");
    const totalRows = tbody.childNodes.length - 2;
    const checkedRows = tbody.querySelectorAll("input:checked").length;

    if (selectAllChecked) {
        confirmBox("Alert!", "Are you sure you want to delete all the records?", delete_all_rows, 1);
    } else if (checkedRows === 0) {
        confirmBox("Alert!", "Please select at least one row to proceed");
    } else if (checkedRows < totalRows / 2) {
        confirmBox("Alert!", `This will delete ${checkedRows} records`, delete_all_rows, 1);
    } else {
        const totalRecords = parseInt(document.getElementById("totalRecordsPanel").innerText.split(" ").pop());
        const notSelected = totalRows - checkedRows;
        const toDelete = totalRecords - totalRows + checkedRows;
        confirmBox("Alert!", `This will delete ${toDelete} records except ${notSelected} not selected records`, delete_all_rows, 1);
    }
};


document.getElementById('multiUpdate').onclick = function () {
    const modal = document.getElementById("modal-update-column");
    if (modal.classList.contains("hidden")) {
        const selectedHeader = table_el.querySelector('thead .selected_col');
        if (selectedHeader) {
            update_column_modal(selectedHeader.innerText);
        } else {
            confirmBox("Alert!", "Please select a column");
        }
    }
};


document.getElementById("updateColumn").onclick = async function (e) {
    const col_name = document.getElementById("ColValueLabel").innerText;
    let col_val = document.getElementById("colValue").value;

    // Use select value for LOV columns
    if (col_name in column_formatters["lov"]) {
        col_val = document.getElementById("colSelectValue").value;
    } else if (col_name in column_formatters["decimals"]) {
        if (isNaN(col_val)) {
            confirmBox("Alert!", "Please enter numeric value");
            return;
        }
    } else if (column_formatters["date"] && col_name in column_formatters["date"]) {
        const parts = col_val.split(' ');
        if (parts[1] === '00:00:00') {
            col_val = parts[0];
        }
    }

    if (typeof col_val === "string" && col_val.trim() === "") {
        col_val = null;
    }

    const [in_flag, rowid_list] = get_selected_rows();

    const result = await gm.updateCol(
        modelName,
        tableName,
        where_in,
        where_not_in,
        like_query,
        rowid_list,
        in_flag,
        document.getElementById("selectAll").parentNode.id,
        col_name,
        col_val
    );

    if (result) {
        const check_flag = rowid_list.length === 0;
        table_el.querySelectorAll("td.selected_col").forEach(td => {
            const tr = td.parentNode;
            if (!tr.classList.contains("insert") && !tr.classList.contains("footer")) {
                if (check_flag || tr.firstChild.firstChild.checked) {
                    td.setAttribute("title", col_val);
                    if (col_name in column_formatters["decimals"]) {
                        td.innerText = get_col_string(col_name, col_val);
                    } else {
                        td.innerText = col_val;
                    }
                }
            }
        });
        document.getElementById("modal-update-column").classList.add("hidden");
        confirmBox("Success!", `Total of ${result} rows updated`);
    }
};

function get_selected_rows() {
    const selectAllChecked = document.getElementById("selectAll").checked;
    const rowid_list = [];
    let in_flag = false;

    if (!selectAllChecked) {
        const tbody = table_el.querySelector("tbody");
        const totalRows = tbody.childNodes.length - 1;
        const checkedInputs = tbody.querySelectorAll("input:checked");
        const checkedCount = checkedInputs.length;

        if (checkedCount < totalRows / 2) {
            in_flag = true;
            checkedInputs.forEach(input => {
                rowid_list.push(input.parentNode.id);
            });
        } else {
            in_flag = false;
            tbody.childNodes.forEach(tr => {
                if (tr.firstChild && tr.firstChild.firstChild) {
                    if (!tr.firstChild.firstChild.checked) {
                        rowid_list.push(tr.firstChild.id);
                    }
                }
            });
        }
    }

    return [in_flag, rowid_list];
}


document.addEventListener('keydown', handleMultiUpdate);

function handleMultiUpdate(e) {
    if (e.key === "F2" && editable_flag) {
        const selectedHeader = table_el.querySelector('thead .selected_col');
        if (selectedHeader) {
            const modal = document.getElementById("modal-update-column");
            if (modal.classList.contains("hidden")) {
                update_column_modal(selectedHeader.innerText);
                e.preventDefault();
            }
        } else {
            confirmBox("Alert!", "Please select a column");
        }
    }
}

function update_column_modal(colName) {
    let inputEl = document.getElementById("colValue");
    inputEl.setAttribute('autocomplete', 'off');
    if (inputEl.parentNode.classList.contains("awesomplete")) {
        const newInput = inputEl.cloneNode(true);
        const parent = inputEl.parentNode.parentNode;
        inputEl.parentNode.remove();
        parent.insertBefore(newInput, parent.firstChild);
        inputEl = newInput;
    }
    inputEl.value = "";
    if (dt_picker) {
        dt_picker.destroy();
        dt_picker = null;
    }
    inputEl.classList.remove("datepicker-input");
    inputEl.removeAttribute('list');
    inputEl.parentNode.style.display = "flex";
    document.getElementById("colSelectValue").parentNode.style.display = "none";
    document.getElementById("ColValueLabel").innerText = colName;

    if (colName in column_formatters["autofiller"]) {
        inputEl.setAttribute("list", `${colName}_dataList`);
        inputEl.parentNode.style.flex = 1;
    } else if (colName in column_formatters["lov"]) {
        const selectEl = document.getElementById("colSelectValue");
        inputEl.parentNode.style.display = "none";
        selectEl.parentNode.style.display = "flex";
        selectEl.innerHTML = "";
        if (column_formatters["lov"][colName].length > 0) {
            for (const val of column_formatters["lov"][colName]) {
                selectEl.appendChild(get_cl_element("option", null, null, document.createTextNode(val)));
            }
            selectEl.firstChild.setAttribute("selected", "");
        } else {
            inputEl.setAttribute("list", `${colName}_dataList`);
        }
    } else if (colName in column_formatters["decimals"]) {
        inputEl.type = "number";
    } else if (column_formatters["date"] && colName in column_formatters["date"]) {
        dt_picker = flatpickr(inputEl, {
            dateFormat: "Y-m-d H:i:S",
            allowInput: true
        });
    } else {
        inputEl.type = "text";
    }
    document.getElementById("modal-update-column").classList.remove("hidden");
}

function open_row(td) {
    initial_row_values = [];
    const tr = td.parentNode;
    for (const [idx, cn] of tr.childNodes.entries()) {
        let isAwesomplete = false;
        if (idx === 0) {
            current_row_id = cn.id;
            initial_row_values.push(cn.id);
        } else {
            let colVal;
            let inputEl;
            if (cn.innerText === "") {
                colVal = null;
            } else if (
                col_names[idx] in column_formatters["decimals"] &&
                !(col_names[idx] in column_formatters["date"]) &&
                !(col_names[idx] in column_formatters["datetime"])
            ) {
                if (cn.getAttribute("title") === null) {
                    colVal = "";
                } else {
                    const titleVal = cn.getAttribute("title");
                    colVal = isNaN(parseFloat(titleVal)) ? titleVal : parseFloat(titleVal);
                }
            } else {
                colVal = cn.innerText;
            }

            if (cn.firstChild) cn.firstChild.remove();
            initial_row_values.push(colVal);

            if (col_names[idx] in column_formatters["lov"]) {
                inputEl = get_cl_element("select", "select p-1", null);
                let selected = false;
                for (const optVal of column_formatters["lov"][col_names[idx]]) {
                    const option = get_cl_element("option", null, null, document.createTextNode(optVal));
                    inputEl.appendChild(option);
                    if (optVal == colVal) {
                        option.setAttribute("selected", "");
                        selected = true;
                    }
                }
                if (!selected) {
                    inputEl.appendChild(get_cl_element("option", null, null, document.createTextNode(colVal)));
                }
            } else if (col_names[idx] in column_formatters["autofiller"]) {
                inputEl = get_cl_element("input", "input p-1", null);
                isAwesomplete = true;
            } else if (
                col_names[idx] in column_formatters["decimals"] &&
                !(col_names[idx] in column_formatters["date"]) &&
                !(col_names[idx] in column_formatters["datetime"])
            ) {
                inputEl = get_cl_element("input", "input p-1", null);
                inputEl.type = "number";
            } else if (column_formatters["datetime"] && col_names[idx] in column_formatters["datetime"]) {
                inputEl = get_cl_element("input", "datepicker-input p-1", null);
                dt_picker = flatpickr(inputEl, {
                    dateFormat: "Y-m-d H:i:S",
                    allowInput: true,
                    defaultDate: colVal
                });
                inputEl.type = "text";
            } else if (column_formatters["date"] && col_names[idx] in column_formatters["date"]) {
                inputEl = get_cl_element("input", "datepicker-input p-1", null);
                inputEl.value = colVal;
                dt_picker = flatpickr(inputEl, {
                    dateFormat: "Y-m-d",
                    allowInput: true,
                    defaultDate: colVal
                });
                inputEl.type = "text";
            } else {
                inputEl = get_cl_element("input", "input p-1", null);
                inputEl.type = "text";
            }

            inputEl.addEventListener("keydown", function (e) {
                if (e.keyCode === 27) {
                    restore_values(tr);
                } else if (e.keyCode === 13) {
                    update_row(tr);
                    e.preventDefault();
                }
            });
            inputEl.value = colVal;
            cn.appendChild(inputEl);
            if (isAwesomplete) {
                inputEl.setAttribute("list", `${col_names[idx]}_dataList`);
            }
        }
    }
    td.firstChild.focus();
}

function get_dataList(col_name, optionsList) {
    const datalist = document.createElement("datalist");
    datalist.id = col_name;
    for (const option of optionsList) {
        const optEl = document.createElement("option");
        optEl.value = option;
        datalist.appendChild(optEl);
    }
    return datalist;
}

function restore_values(tr) {
    const restoredRow = get_table_row(initial_row_values);
    tr.parentNode.replaceChild(restoredRow, tr);
    initial_row_values = [];
    current_row_id = 0;
}

function detect_changes(updated_row) {
    return JSON.stringify(updated_row) !== JSON.stringify(initial_row_values);
}


async function update_row(tr) {
    const updated_row = get_row_array(tr);
    if (!updated_row || updated_row.length === 0) return;

    if (!detect_changes(updated_row)) {
        restore_values(tr);
        return;
    }

    const update_dict = {};
    for (let idx = 0; idx < updated_row.length; idx++) {
        const val = updated_row[idx];
        if (val !== initial_row_values[idx]) {
            const col_name = col_names[idx];
            if (column_formatters["date"] && col_name in column_formatters["date"]) {
                update_dict[col_name] = convertDateToExcelDate(val);
            } else if (column_formatters["datetime"] && col_name in column_formatters["datetime"]) {
                update_dict[col_name] = convertDateTimeToExcelNumber(val);
            } else {
                update_dict[col_name] = val;
            }
        }
    }

    initial_row_values = [];
    current_row_id = 0;

    await gm.updateRow(modelName, tableName, updated_row[0], update_dict, document.getElementById("selectAll").parentNode.id);

    const table = table_el.querySelector('table');
    const new_tr = get_table_row(updated_row);

    let leftC = 0;
    for (let i = 0; i < freeze_col_num; i++) {
        leftC += table.rows[0].cells[i].clientWidth + 1;
        for (const cell of new_tr.cells) {
            if (i === 0 && cell.classList.contains(`C${i}`)) {
                cell.style.left = "0px";
            } else if (cell.classList.contains(`C${i + 1}`)) {
                cell.style.left = leftC + "px";
            }
        }
    }

    tr.parentNode.replaceChild(new_tr, tr);
}


function add_insert_row() {
    const tr = get_cl_element("tr", "insert border-r");
    for (let idx = 0; idx < col_names.length; idx++) {
        const col_name = col_names[idx];
        const td = get_cl_element("td", "px-3 py-2 border-r");
        tr.appendChild(td);

        if (idx === 0) {
            td.id = 0;
            continue;
        }

        let input_el;
        let autofill_flag = false;

        if (col_name in column_formatters["lov"] && column_formatters["lov"][col_name].toLowerCase() !== 'freetext') {
            input_el = get_cl_element("select", "select p-1", null);
            for (const opt_val of column_formatters["lov"][col_name]) {
                input_el.appendChild(get_cl_element("option", null, null, document.createTextNode(opt_val)));
            }
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
                for (const cn of this.parentNode.parentNode.childNodes) {
                    const inp_el = cn.firstChild;
                    if (inp_el && inp_el.classList.contains("form-ctrl")) {
                        inp_el.value = "";
                    }
                }
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


async function insert_row(tr) {
    const row_data = get_row_array(tr);
    if (!row_data) return;

    const insert_dict = {};
    for (let idx = 1; idx < row_data.length; idx++) {
        insert_dict[col_names[idx]] = row_data[idx];
    }

    try {
        const result = await gm.insertRow(modelName, tableName, insert_dict);
        if (result && result.Success) {
            row_data[0] = result.Success;
            const tbody = tr.parentNode;
            const summary = tbody.lastChild;
            const new_tr = get_table_row(row_data);
            tr.remove();
            tbody.appendChild(new_tr);
            tbody.appendChild(add_insert_row());
            tbody.appendChild(summary);
        } else {
            confirmBox("Error!", `Error: ${result?.Error || "Unknown error"}`);
        }
    } catch (err) {
        confirmBox("Error!", `Error: ${err.message || err}`);
    }
}

function get_table_row(row, selected_idx = 0, select_all = false, page_num = 1) {
    const tr = get_cl_element("tr", "border-r hover:bg-gray-100 dark:hover:bg-gray-800");
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
            td = get_cl_element("td", "px-3 py-2 border-r align-top whitespace-normal", val, input_el);
            tr.appendChild(td);
        } else {
            if (val === null) {
                td = get_cl_element("td", "px-3 py-2 align-top border-r whitespace-normal");
            } else if (
                col_names[idx] in column_formatters["decimals"] &&
                !(col_names[idx] in column_formatters["date"]) &&
                !(col_names[idx] in column_formatters["datetime"])
            ) {
                td = get_cl_element("td", "px-3 py-2 align-top text-right border-r whitespace-normal");
                td.style.textAlign = "right";
                if (isNaN(val)) {
                    td.appendChild(document.createTextNode(val));
                    td.style.backgroundColor = "red";
                    td.setAttribute("title", "Expecting Numeric Value");
                } else {
                    td.appendChild(document.createTextNode(get_col_string(col_names[idx], val)));
                    td.setAttribute("title", val);
                }
            } else {
                td = get_cl_element("td", "px-3 py-2 border-r align-top whitespace-normal", null, document.createTextNode(val));
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
            tr.appendChild(td);
        }
        if (idx < freeze_col_num) {
            td.classList.add(`C${idx}`, "ZDX_R", "STX", "FXC");
        }
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

    // Hide all format fields initially
    decimalPlaces.parentElement.style.display = 'none';
    commaSeparator.parentElement.style.display = 'none';
    localeString.parentElement.style.display = 'none';
    displayCurrency.parentElement.style.display = 'none';
    aggregateFunction.parentElement.style.display = 'none';
    fieldType.parentElement.style.display = '';

    // Set LOV text visibility
    if (!(colName in column_formatters["decimals"])) {
        lovText.style.display = '';
    } else {
        lovText.style.display = 'none';
    }

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

    // Numeric column
    if (colName in column_formatters["decimals"] && !(colName in column_formatters['date']) && !(colName in column_formatters['datetime'])) {
        fieldType.add(new Option(options.numeric, 'numeric'));
        fieldType.add(new Option(options.date, 'date'));
        fieldType.add(new Option(options.datetime, 'datetime'));
        fieldType.value = 'numeric';

        decimalPlaces.parentElement.style.display = '';
        commaSeparator.parentElement.style.display = '';
        localeString.parentElement.style.display = '';
        displayCurrency.parentElement.style.display = '';
        aggregateFunction.parentElement.style.display = '';

        decimalPlaces.value = column_formatters["decimals"][colName];
        commaSeparator.value = column_formatters["comma"][colName];
        localeString.value = column_formatters["locale"][colName];
        displayCurrency.value = column_formatters["currency"][colName];
        aggregateFunction.value = column_formatters["aggregate"][colName];
    } else {
        // Non-numeric columns
        for (let key in options) {
            if (key !== 'numeric') {
                fieldType.add(new Option(options[key], key));
            }
        }

        let colVals = [];
        if (colName in column_formatters['lov'] && column_formatters['lov'][colName].toLowerCase() !== 'freetext') {
            fieldType.value = 'lov';
            colVals = column_formatters['lov'][colName];
        } else if (colName in column_formatters['autofiller']) {
            fieldType.value = 'autofiller';
            colVals = column_formatters['autofiller'][colName];
        } else if (colName in column_formatters['date']) {
            fieldType.value = 'date';
            lovText.style.display = 'none';
        } else if (colName in column_formatters['datetime']) {
            fieldType.value = 'datetime';
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

    // If date/datetime, add numeric option
    if (colName in column_formatters['date'] || colName in column_formatters['datetime']) {
        fieldType.add(new Option(options.numeric, 'numeric'));
        fieldType.value = colName in column_formatters['datetime'] ? 'datetime' : 'date';
        lovText.style.display = 'none';
    }

    document.getElementById('modal-format-column').classList.remove('hidden');
};


const fieldType = document.getElementById('fieldType');
const lovInnerText = document.getElementById('lovText');

fieldType.addEventListener('change', function (e) {
    decimalPlaces.parentElement.style.display = 'none';
    commaSeparator.parentElement.style.display = 'none';
    localeString.parentElement.style.display = 'none';
    displayCurrency.parentElement.style.display = 'none';
    aggregateFunction.parentElement.style.display = 'none';

    const type = e.target.value;
    if (['date', 'datetime', 'freetext', 'numeric'].includes(type)) {
        lovInnerText.style.display = 'none';
        if (type === 'numeric') {
            decimalPlaces.parentElement.style.display = '';
            commaSeparator.parentElement.style.display = '';
            localeString.parentElement.style.display = '';
            displayCurrency.parentElement.style.display = '';
            aggregateFunction.parentElement.style.display = '';
        }
    } else {
        lovInnerText.style.display = '';
    }
});

document.getElementById("updateFormats").onclick = async function () {
    const col_name = table_el.querySelector('thead .selected_col').innerText;
    const n = parseInt(document.getElementById("decimalPlaces").value);
    const aggregate = document.getElementById("aggregateFunction").value;
    const comma_flag = parseInt(document.getElementById("commaSeparator").value);
    const fieldType = document.getElementById('fieldType').value;
    const lovInnerText = document.getElementById('lovText').value;
    let locale = document.getElementById("localeString").value;
    let currency = document.getElementById("displayCurrency").value;
    const parameter_dict = {};

    if (currency === "0") currency = 0;
    if (locale === "0") locale = 0;

    // Handle date/datetime
    if (fieldType === 'date' || fieldType === 'datetime') {
        ["decimals", "comma", "locale", "currency", "aggregate"].forEach(k => {
            if (col_name in column_formatters[k]) delete column_formatters[k][col_name];
        });
        parameter_dict["LOV"] = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
        ["lov", "autofiller", "query"].forEach(k => {
            if (col_name in column_formatters[k]) delete column_formatters[k][col_name];
        });
        if (col_name in column_formatters['date'] && fieldType !== 'date') delete column_formatters['date'][col_name];
        if (col_name in column_formatters['datetime'] && fieldType !== 'datetime') delete column_formatters['datetime'][col_name];
        column_formatters[fieldType][col_name] = 1;
    }
    // Handle autofiller
    else if (fieldType === 'autofiller' && lovInnerText !== '') {
        parameter_dict["LOV"] = `Autofiller | ${lovInnerText}`;
        if (col_name in column_formatters['lov']) delete column_formatters['lov'][col_name];
        column_formatters['query'][col_name] = lovInnerText;
        if (lovInnerText.trim().toLowerCase().startsWith("select")) {
            const result = await gm.runSelectQuery(modelName, lovInnerText);
            column_formatters["autofiller"][col_name] = result;
            let dl = document.getElementById(`${col_name}_dataList`);
            if (dl) dl.remove();
            document.getElementById("dataList_div").appendChild(get_dataList(`${col_name}_dataList`, result));
        } else {
            const lov_list2 = lovInnerText.trim().split(";").map(v => v.trim()).filter(v => v.length > 0);
            column_formatters["autofiller"][col_name] = lov_list2;
            let dl = document.getElementById(`${col_name}_dataList`);
            if (dl) dl.remove();
            document.getElementById("dataList_div").appendChild(get_dataList(`${col_name}_dataList`, lov_list2));
        }
    }
    // Handle LOV
    else if (fieldType === 'lov' && lovInnerText !== '') {
        parameter_dict["LOV"] = `Select | ${lovInnerText}`;
        if (col_name in column_formatters['lov']) delete column_formatters['lov'][col_name];
        if (lovInnerText.trim().toLowerCase().startsWith("select")) {
            column_formatters["query"][col_name] = lovInnerText;
            const result = await gm.runSelectQuery(modelName, lovInnerText);
            column_formatters["lov"][col_name] = result;
        } else {
            const lov_list2 = lovInnerText.trim().split(";").map(v => v.trim()).filter(v => v.length > 0);
            column_formatters["lov"][col_name] = lov_list2;
        }
    }
    // Handle freetext
    else if (fieldType === 'freetext') {
        parameter_dict["LOV"] = 'Freetext';
        ["lov", "autofiller", "date", "datetime", "query"].forEach(k => {
            if (col_name in column_formatters[k]) delete column_formatters[k][col_name];
        });
    }
    // Handle numeric
    else if (col_name_types[col_name] === 'NUMERIC') {
        ["lov", "autofiller", "date", "datetime", "query"].forEach(k => {
            if (col_name in column_formatters[k]) delete column_formatters[k][col_name];
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
    }
    // Invalid conversion
    else {
        confirmBox('Alert', "You can't convert text column to Numeric.");
        return;
    }

    document.getElementById('modal-format-column').classList.add('hidden');
    await gm.setTableFormatter(modelName, tableName, col_name, parameter_dict);
    reload_table_data();

    let el = table_el.querySelector('tr.insert');
    if (el) el.remove();
    const tbody = table_el.querySelector('tbody');
    tbody.appendChild(add_insert_row());

    table_el.querySelectorAll("td.selected_col").forEach(cn => {
        if (cn.firstChild && cn.firstChild.tagName !== "INPUT") {
            if (col_name in column_formatters["decimals"]) {
                let val = parseFloat(cn.getAttribute("title"));
                cn.innerText = get_col_string(col_name, val);
            } else {
                let val = cn.getAttribute("title");
                cn.innerText = val;
            }
        }
    });
};

function get_col_string(col_name, col_val) {
    if (col_val == null || col_val === undefined) return "";

    const decimals = column_formatters["decimals"][col_name] ?? 2;
    const comma = column_formatters["comma"][col_name] ? true : false;
    const locale = column_formatters["locale"][col_name] || undefined;
    const currency = column_formatters["currency"][col_name];
    let options = {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: comma
    };

    if (currency) {
        options.style = "currency";
        options.currency = currency;
    }

    // If col_val is not a number, return as string
    if (isNaN(col_val)) return String(col_val);

    return Number(col_val).toLocaleString(locale, options);
}

function get_row_array(tr) {
    const updated_row = [];
    const header_row = table_el.querySelector("tr.headers").childNodes;

    for (let idx = 0; idx < tr.childNodes.length; idx++) {
        const cn = tr.childNodes[idx];
        if (idx === 0) {
            updated_row.push(cn.id);
            continue;
        }

        let col_val = cn.firstChild.value;
        // Handle awesomplete input
        if (cn.firstChild.classList.contains("awesomplete") && cn.firstChild.firstChild) {
            col_val = cn.firstChild.firstChild.value;
        }

        const col_name = col_names[idx];

        // Numeric validation
        if (
            col_name in column_formatters["decimals"] &&
            isNaN(col_val) &&
            !(col_name in column_formatters["date"]) &&
            !(col_name in column_formatters["datetime"])
        ) {
            confirmBox("Alert!", `Please enter numeric value in ${col_name} Column`);
            return;
        }

        // Not null validation for required columns
        if (
            typeof col_val === "string" &&
            col_val.trim() === "" &&
            header_row[idx].querySelector("u")
        ) {
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

        // Handle empty string and "null" string
        if (typeof col_val === "string" && col_val.trim() === "") {
            col_val = null;
        } else if (
            typeof col_val === "string" &&
            col_val.trim() === "null" &&
            col_name in column_formatters["lov"]
        ) {
            col_val = null;
        } else if (
            col_name in column_formatters["decimals"] &&
            !(col_name in column_formatters["date"]) &&
            !(col_name in column_formatters["datetime"])
        ) {
            col_val = parseFloat(col_val);
        }

        updated_row.push(col_val);
    }

    return updated_row;
}

function reset_sort() {
    let shouldUpdate = false;
    const headerCells = document.querySelector('.headers').childNodes;
    headerCells.forEach(cell => {
        const icon = cell.querySelector('span');
        if (icon && !icon.classList.contains('fa-sort')) {
            shouldUpdate = true;
            icon.classList.remove('fa-sort-down', 'fa-sort-up');
            icon.classList.add('fa-sort');
        }
    });
    if (shouldUpdate) {
        sort_columns = [];
        sort_col_names = {};
        get_table_data(col_names);
        save_sort();
    }
}


document.getElementById("copyTable").onclick = async function () {
    const loader = document.getElementById("data-loader");
    loader.style.display = "";
    try {
        const data = await gm.fetchTableData(modelName, tableName, col_names, parameters, {}, {}, 1, [], false);
        loader.style.display = "none";
        if (data && data[1] > 100000) {
            confirmBox("Alert!", "Sorry! , Data exceeded maximum Limit");
            return;
        }
        if (data) {
            copyArrayToClipboard(data[0]);
        }
    } catch (err) {
        loader.style.display = "none";
        confirmBox("Alert!", `Error occured : ${err.message || err}`);
    }
};

function copyTextToClipboard(text) {
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
        row.map(cell => String(cell).replace(/[\n\t]+/g, ' ')).join('\t')
    ).join('\n');
    copyTextToClipboard(csv);
}

document.getElementById("excelUploadBtn").onclick = () => {
    const fileInput = document.getElementById("fileUpload");
    fileInput.value = "";
    document.getElementById('modal-file-upload').classList.remove('hidden');
};

function get_icon_class(col_name) {
    for (const [name, order] of sort_columns) {
        if (col_name === name) {
            return order === "asc" ? "fa-sort-down" : "fa-sort-up";
        }
    }
    return "fa-sort";
}

document.getElementById("saveSort").onclick = async function () {
    await gm.saveSortColumns(modelName, tableName, sort_columns);
    sort_col_names = {};
    sort_columns.forEach(sc => {
        sort_col_names[sc[0]] = sc[1];
    });
    confirmBox("Success", "Sort saved successfully");
};
async function get_sort() {
    const data = await gm.fetchSort(modelName, tableName);
    sort_columns = Array.isArray(data) ? data : [];
    sort_col_names = {};
    sort_columns.forEach(([col, order]) => {
        sort_col_names[col] = order;
    });
}

function get_parameters() {
    for (const [key, value] of params.entries()) {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== 'tablename' && lowerKey !== 'modelname') {
            parameters[key] = value.split(',');
        }
    }
}

function freeze_headers() {
    const table = table_el.querySelector('table');
    let leftOffset = 0;

    for (let i = 0; i < freeze_col_num; i++) {
        leftOffset += table.rows[0].cells[i].clientWidth + 1;

        for (const row of table.rows) {
            for (const cell of row.cells) {
                if (i === 0 && cell.classList.contains(`C${i}`)) {
                    cell.style.left = "0px";
                } else if (cell.classList.contains(`C${i + 1}`)) {
                    cell.style.left = `${leftOffset}px`;
                }
            }
        }
    }
}

document.getElementById('saveFreeze').onclick = async function () {
    const selectedHeader = table_el.querySelector('thead .selected_col');
    if (!selectedHeader) {
        confirmBox("Alert!", "Please select a column");
        return;
    }

    const colName = selectedHeader.innerText;
    let colNum = col_names.indexOf(colName) + 1;

    // If already frozen, unfreeze
    if (colNum === freeze_col_num) {
        colNum = 0;
    }

    await gm.freezeColNum(modelName, tableName, colNum);
    freeze_col_num = colNum;

    table_el.querySelectorAll("tr").forEach(tr => {
        const idx = col_names.indexOf(colName);
        if (tr.childNodes[idx]) {
            tr.childNodes[idx].classList.remove("selected_col");
        }
        tr.childNodes.forEach((el, i) => {
            if (i < freeze_col_num) {
                el.classList.add(`C${i}`);
                if (tr.classList.contains('headers') || tr.classList.contains('lovRow')) {
                    el.classList.add('ZDX_H');
                } else {
                    el.classList.add('ZDX_R', 'STX', 'FXC');
                }
            } else {
                if (tr.classList.contains('headers') || tr.classList.contains('lovRow')) {
                    el.style.left = '';
                    el.classList.remove(`C${i}`, 'ZDX_H');
                } else {
                    el.classList.remove('ZDX_R', 'STX', 'FXC');
                }
            }
        });
    });

    freeze_headers();
};

function convertDateToExcelDate(date) {
    const d = new Date(date);
    const excelEpoch = new Date(1899, 11, 30);
    const days = (d - excelEpoch) / (1000 * 60 * 60 * 24);
    return Math.floor(days);
}

function convertDateTimeToExcelNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const excelEpoch = new Date(1899, 11, 30);
    const days = (d - excelEpoch) / (1000 * 60 * 60 * 24);
    return Math.floor(days + 1);
}
