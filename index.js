const puppeteer = require("puppeteer")
const pg = require("pg")
const config = {
    host: 'localhost',
    user: 'postgres',
    port: 5432,
    password: '0000',
    database: 'Persons'
}

const client = new pg.Client(config)
client.connect(err => {
    if (err) console.log(err);
    else {
        console.log("All is OK");
    }
});

async function for_sites(pages, ind, arr) {
    let count_sites = await pages.$$eval(`#personal > div > table > tbody > tr:nth-child(${ind}) > td:nth-child(2) > a`, (el) => el.length)
    let arr_sites = await pages.$$eval(`#personal > div > table > tbody > tr:nth-child(${ind}) > td:nth-child(2) > a`, (el) => el.map(elem => elem.innerText))
    let arr_hrefs = await pages.$$eval(`#personal > div > table > tbody > tr:nth-child(${ind}) > td:nth-child(2) > a`, (el) => el.map(elem => elem.href))
    for (let i = 0; i < count_sites; i++) {
        sites = {
            href_site: arr_hrefs[i],
            site_name: arr_sites[i]
        }
        arr.push(sites)
    }
    return arr
}

class Persons {

    async main_information(page_pers, id) {
        await page_pers.waitForSelector(`#profile-wrap`)
        this.id = Number(id)
        try {
            let name = await page_pers.$eval(`#profile-wrap > header > h1 > span.pep-pib > span:nth-child(1)`, (el) => el.innerText)
            let surname = await page_pers.$eval(`#profile-wrap > header > h1 > span:nth-child(1)`, (el) => el.innerText)
            let patronymic = await page_pers.$eval(`#profile-wrap > header > h1 > span.pep-pib > span:nth-child(2)`, (el) => el.innerText)
            surname = surname.toLowerCase()
            surname = surname.charAt(0).toUpperCase() + surname.slice(1)
            name = name.toLowerCase()
            name = name.charAt(0).toUpperCase() + name.slice(1)
            patronymic = patronymic.toLowerCase()
            patronymic = patronymic.charAt(0).toUpperCase() + patronymic.slice(1)
            let full_name = surname + " " + name + " " + patronymic
            this.name = full_name
        }
        catch {
            this.name = null
        }
        await page_pers.waitForSelector(`#personal`)
        let rows_count_pers = await page_pers.$eval(`#personal > div > table`, (el) => el.rows.length)
        let array_sites = []
        let m_category, m_date_of_dismissal, m_date_of_birth, m_other_names, m_under_sanction, m_INN, m_place_birth, m_sitizenship, m_last_post, m_reg_bus
        for (let i = 1; i < rows_count_pers + 1; i++) {
            let box = await page_pers.$eval(`#personal > div > table > tbody > tr:nth-child(${i}) > td:nth-child(1)`, (el) => el.innerText)
            let value = await page_pers.$eval(`#personal > div > table > tbody > tr:nth-child(${i}) > td:nth-child(2)`, (el) => el.innerText)
            switch (box) {
                case ('Категория'): m_category = value;
                    break;
                case ('Дата увольнения'): m_date_of_dismissal = value;
                    break;
                case ('Дата рождения'): m_date_of_birth = value;
                    break;
                case ('Другие имена'): m_other_names = value;
                    break;
                case ('Под санкциями'): m_under_sanction = value;
                    break;
                case ('ИНН'): m_INN = value;
                    break;
                case ('Место рождения'): m_place_birth = value;
                    break;
                case ('Гражданство'): m_sitizenship = value;
                    break;
                case ('Имеет зарегистрированный бизнес'): m_reg_bus = value;
                    break;
                case ('Последняя должность'): m_last_post = value;
                    break;
                case ('Профили в социальных сетях'):
                    let mas_soc = await for_sites(page_pers, i, array_sites)
                    array_sites.concat(array_sites, mas_soc)
                    break;
                case ('Другие вебсайты'):
                    let mas_other = await for_sites(page_pers, i, array_sites)
                    array_sites.concat(array_sites, mas_other)
                    break;
                default: console.log("Такое значение не найдено");
                    break;
            }
            try {
                let dismissal = await page_pers.$eval(`#personal > div > table > tbody > tr.non-pep-info`, (el) => el.innerText)
                dismissal = dismissal.replace(/\t/g, " ")
                try {
                    let dismissal = await page_pers.$eval(`#personal > div > table > tbody > tr.non-pep-info.dead-pep-info`, (el) => el.innerText)
                    dismissal += dismissal.replace(/\t/g, " ")
                }
                catch { }
                this.dismissal = dismissal != undefined ? dismissal : null
            }
            catch { }
        }

        m_category != undefined ? this.category = m_category : this.category = null;
        m_date_of_dismissal != undefined ? this.date_of_dismissal = m_date_of_dismissal : this.date_of_dismissal = null;
        m_date_of_birth != undefined ? this.date_of_birth = m_date_of_birth : this.date_of_birth = null;
        m_other_names != undefined ? this.other_names = m_other_names : this.other_names = null;
        m_under_sanction != undefined ? this.under_sanction = m_under_sanction : this.under_sanction = null;
        m_INN != undefined ? this.INN = Number(m_INN) : this.INN = null;
        m_place_birth != undefined ? this.place_birth = m_place_birth : this.place_birth = null;
        m_sitizenship != undefined ? this.sitizenship = m_sitizenship : this.sitizenship = null;
        m_last_post != undefined ? this.last_post = m_last_post : this.last_post = null;
        m_reg_bus != undefined ? this.reg_bus = m_reg_bus : this.reg_bus = null;

        const tetx_main_check = 'Select * from "Persons" where id = $1'
        const values_main_check = [this.id]
        try {
            await client.query(tetx_main_check, values_main_check, async (err, res) => {
                if (err) {
                    console.log(err.stack)
                } else {
                    if (res.rowCount == 0) {
                        const tetx_main = 'INSERT INTO "Persons" (id, full_name, category, last_position, place_of_birth, citizenship, "INN", other_names, under_sanctions, resign, date_of_birth, date_of_dismissal, registered_business) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)'
                        const values_main = [this.id, this.name, this.category, this.last_post, this.place_birth, this.sitizenship, this.INN, this.other_names, this.under_sanction, this.dismissal, this.date_of_birth, this.date_of_dismissal, this.reg_bus]
                        try {
                            await client.query(tetx_main, values_main);
                        }
                        catch (err) { console.log(err.stack) }

                    }
                    else {
                        const tetx_main_upd = 'Update "Persons" set id = $1, full_name= $2, category= $3, last_position= $4, place_of_birth= $5, citizenship= $6, "INN"= $7, other_names= $8, under_sanctions= $9, resign= $10, date_of_birth= $11, date_of_dismissal= $12, registered_business= $13 where id = $1'
                        const values_main_upd = [this.id, this.name, this.category, this.last_post, this.place_birth, this.sitizenship, this.INN, this.other_names, this.under_sanction, this.dismissal, this.date_of_birth, this.date_of_dismissal, this.reg_bus]
                        try {
                            await client.query(tetx_main_upd, values_main_upd);
                        }
                        catch (err) { console.log(err.stack) }
                    }
                }
            });
        }
        catch { }


        if (array_sites.length != 0) {
            this.websites = array_sites
            for (let i = 0; i < array_sites.length; i++) {
                const text_href_check = 'Select * From "Other_sites" where id_person = $1 and href = $2'
                const values_href_check = [this.id, this.websites[i].href_site]
                try {
                    await client.query(text_href_check, values_href_check, async (err, res) => {
                        if (err) {
                            console.log(err.stack)
                        } else {
                            if (res.rowCount == 0) {
                                const text_href = 'INSERT INTO "Other_sites"(id_person, href, name) VALUES ($1, $2, $3);'
                                const values_href = [this.id, this.websites[i].href_site, this.websites[i].site_name]
                                try {
                                    await client.query(text_href, values_href);
                                }
                                catch (err) { console.log(err.stack) }

                            }
                            else {
                                const tetx_href_upd = 'Update "Other_sites" set id_person = $1, href = $2, name=$3 where id_person = $1 and href = $2'
                                const values_href_upd = [this.id, this.websites[i].href_site, this.websites[i].site_name]
                                try {
                                    await client.query(tetx_href_upd, values_href_upd);
                                }
                                catch (err) { console.log(err.stack) }
                            }
                        }
                    });
                }
                catch { }

            }
        }
    }

    async pers_dossier(page_pers) {
        try {
            await page_pers.waitForSelector(`#profile-wiki`)
            let array_dossier = []
            try {
                const p_count = await page_pers.evaluate(() => {
                    let leng = document.querySelectorAll("#profile-wiki > div > div > p").length;
                    return leng;
                });
                for (let i = 1; i < p_count + 1; i++) {
                    let href_dossier = await page_pers.$eval(`#profile-wiki > div > div > p:nth-child(${i}) > a`, (el) => el.href)
                    let sourse_dossier = await page_pers.$eval(`#profile-wiki > div > div > p:nth-child(${i})`, (el) => el.innerText)
                    let dossier_obj = {
                        dossier_href: href_dossier,
                        dossier_sourse: sourse_dossier.replace(/\r?\n/g, "")
                    }
                    array_dossier.push(dossier_obj)
                }
                this.dossier = array_dossier
            }
            catch { }
            if (array_dossier.length != 0) {
                for (let i = 0; i < array_dossier.length; i++) {
                    const text_dos_check = 'Select * from "Dossier" where id_person = $1 and source = $2'
                    const values_dos_check = [this.id, this.dossier[i].dossier_href]
                    try {
                        await client.query(text_dos_check, values_dos_check, async (err, res) => {
                            if (err) {
                                console.log(err.stack)
                            } else {
                                if (res.rowCount == 0) {
                                    const text_dos = 'INSERT INTO "Dossier"(id_person, source, information) VALUES ($1, $2, $3);'
                                    const values_dos = [this.id, this.dossier[i].dossier_href, this.dossier[i].dossier_sourse]
                                    try {
                                        await client.query(text_dos, values_dos);
                                    }
                                    catch (err) { console.log(err.stack) }

                                }
                                else {
                                    const tetx_dos_upd = 'Update "Dossier" set id_person = $1, source = $2, information=$3 where id_person = $1 and source = $2'
                                    const values_dos_upd = [this.id, this.websites[i].href_site, this.websites[i].site_name]
                                    try {
                                        await client.query(tetx_dos_upd, values_dos_upd);
                                    }
                                    catch (err) { console.log(err.stack) }
                                }
                            }
                        });
                    }
                    catch { }

                }
            }
        }
        catch { }
    }

    async pers_career(page_pers, id_pers) {
        try {
            await page_pers.waitForSelector(`#workbefore`)
            let array_career = []
            const li_count_career = await page_pers.evaluate(() => {
                let leng = document.getElementById("element").getElementsByTagName('li').length;
                return leng;
            });
            let browser_org = await puppeteer.launch()
            let page_org = await browser_org.newPage()
            for (let i = 1; i < li_count_career + 1; i++) {
                let dates = await page_pers.$eval(`#element > ul > li:nth-child(${i}) > div.tl-wrap > span`, (el) => el.innerText)
                dates = dates.split(/\n/)
                dates = dates.filter(function (el) { return el != '' })
                let date_start, date_end, organization, organization_href, post
                dates.forEach(function (element_c) {
                    if (String(element_c).includes('от'))
                        date_start = element_c
                    else if (String(element_c).includes('до'))
                        date_end = element_c
                    else {
                        date_end = null
                        date_start = null
                    }
                });

                organization = await page_pers.$eval(`#element > ul > li:nth-child(${i}) > div.tl-wrap > div > div > a:nth-child(1)`, (el) => el.innerText)
                organization_href = await page_pers.$eval(`#element > ul > li:nth-child(${i}) > div.tl-wrap > div > div > a:nth-child(1)`, (el) => el.href)
                post = await page_pers.$eval(`#element > ul > li:nth-child(${i}) > div.tl-wrap > div > div`, (el) => el.innerText)
                post = post.substring(organization.length + 2)
                post = post.charAt(0).toUpperCase() + post.slice(1)

                let ogrn
                try {
                    await page_org.goto(organization_href, { timeout: 0 })
                    await page_org.waitForSelector(`#profile-wrap`)
                    let rows_count_comp = await page_org.$eval(`#personal > div > table`, (el) => el.rows.length)
                    for (let i = 1; i < rows_count_comp + 1; i++) {
                        let box = await page_org.$eval(`#personal > div > table > tbody > tr:nth-child(${i}) > td:nth-child(1)`, (el) => el.innerText)
                        let value = await page_org.$eval(`#personal > div > table > tbody > tr:nth-child(${i}) > td:nth-child(2)`, (el) => el.innerText)
                        if (box == 'ОГРН') ogrn = Number(value)
                        if (ogrn == undefined) ogrn = null
                    }
                }
                catch { }


                let career_obj = {
                    id_person: Number(id_pers),
                    id_career: i,
                    date_start_career: date_start != undefined ? date_start : null,
                    date_end_career: date_end != undefined ? date_end : null,
                    name_organization: organization,
                    organization_post: post,
                    OGRN: ogrn
                }
                array_career.push(career_obj)
            }
            this.career = array_career
            if (array_career.length != 0) {
                for (let i = 0; i < array_career.length; i++) {
                    const text_career_check = 'Select * from "Career" where id_career = $1 and id_person = $2'
                    const values_career_check = [this.career[i].id_career, this.id]
                    try {
                        await client.query(text_career_check, values_career_check, async (err, res) => {
                            if (err) {
                                console.log(err.stack)
                            } else {
                                if (res.rowCount == 0) {
                                    const text_career = 'INSERT INTO "Career"(id_career, id_person, organization, "OGRN", post, date_start, date_end) VALUES ($1, $2, $3, $4, $5, $6, $7);'
                                    const values_career = [this.career[i].id_career, this.id, this.career[i].name_organization, this.career[i].OGRN, this.career[i].organization_post, this.career[i].date_start_career, this.career[i].date_end_career]
                                    try {
                                        await client.query(text_career, values_career);
                                    }
                                    catch (err) { console.log(err.stack) }

                                }
                                else {
                                    const tetx_career_upd = 'Update "Career" set id_career = $1, id_person = $2, organization = $3, "OGRN" = $4, post = $5, date_start = $6, date_end = $7 where id_career = $1 and id_person = $2'
                                    const values_career_upd = [this.career[i].id_career, this.id, this.career[i].name_organization, this.career[i].OGRN, this.career[i].organization_post, this.career[i].date_start_career, this.career[i].date_end_career]
                                    try {
                                        await client.query(tetx_career_upd, values_career_upd);
                                    }
                                    catch (err) { console.log(err.stack) }
                                }
                            }
                        });
                    }
                    catch { }

                }
            }
            await browser_org.close()
        }
        catch { }
    }

    async pers_declare(page_pers) {
        try {
            await page_pers.waitForSelector(`#declarations`)
            let array_declare = []
            let rows_count_decl = await page_pers.$eval(`#declarations > div > div > table`, (el) => el.rows.length)
            for (let i = 1; i < rows_count_decl; i++) {
                let year = await page_pers.$eval(`#declarations > div > div > table > tbody > tr:nth-child(${i}) > td.decl-year`, (el) => el.innerText)
                let post = await page_pers.$eval(`#declarations > div > div > table > tbody > tr:nth-child(${i}) > td.decl-position`, (el) => el.innerText)
                post = post.replace(/\n/g, " ")
                let income = await page_pers.$eval(`#declarations > div > div > table > tbody > tr:nth-child(${i}) > td.decl-income`, (el) => el.innerText)
                income = income.replace(/\n/g, " ")
                let family_income = await page_pers.$eval(`#declarations > div > div > table > tbody > tr:nth-child(${i}) > td:nth-child(4)`, (el) => el.innerText)
                family_income = family_income.replace(/\n/g, " ")
                let realty = await page_pers.$eval(`#declarations > div > div > table > tbody > tr:nth-child(${i}) > td:nth-child(5)`, (el) => el.innerText)
                realty = realty.replace(/\n/g, " ")
                let transport = await page_pers.$eval(`#declarations > div > div > table > tbody > tr:nth-child(${i}) > td:nth-child(6)`, (el) => el.innerText)
                transport = transport.replace(/\n/g, " ")

                let decl_row = {
                    d_year: year,
                    d_post: post,
                    d_income: income,
                    d_spouce_income: family_income,
                    d_realty: realty,
                    d_transport: transport
                }
                array_declare.push(decl_row)
                array_declare.forEach(function (el) {
                    let ye_1 = el.d_year
                    let match_count = 0
                    for (let j = 0; j < array_declare.length; j++) {
                        if (ye_1 == array_declare[j].d_year) {
                            match_count++
                            if (match_count > 1) {
                                delete array_declare[j]
                            }
                        }
                    }
                })
            }
            this.declaration = array_declare

            if (array_declare.length != 0) {
                for (let i = 0; i < array_declare.length; i++) {
                    const text_dec_check = 'Select * from "Declaration" where id_person = $1 and yaer = $2'
                    const values_dec_check = [this.id, this.declaration[i].d_year]
                    try {
                        await client.query(text_dec_check, values_dec_check, async (err, res) => {
                            if (err) {
                                console.log(err.stack)
                            } else {
                                if (res.rowCount == 0) {
                                    const text_dec = 'INSERT INTO "Declaration"(id_person, yaer, post, realty, transport, income, spouse_income) VALUES ($1, $2, $3, $4, $5, $6, $7);'
                                    const values_dec = [this.id, this.declaration[i].d_year, this.declaration[i].d_post, this.declaration[i].d_realty, this.declaration[i].d_transport, this.declaration[i].d_income, this.declaration[i].d_spouce_income]
                                    try {
                                        await client.query(text_dec, values_dec);
                                    }
                                    catch (err) { console.log(err.stack) }

                                }
                                else {
                                    const tetx_dec_upd = 'Update "Declaration" set id_person=$1, yaer=$2, post=$3, realty=$4, transport=$5, income=$6, spouse_income=$7 where id_person = $1 and yaer = $2'
                                    const values_dec_upd = [this.id, this.declaration[i].d_year, this.declaration[i].d_post, this.declaration[i].d_realty, this.declaration[i].d_transport, this.declaration[i].d_income, this.declaration[i].d_spouce_income]
                                    try {
                                        await client.query(tetx_dec_upd, values_dec_upd);
                                    }
                                    catch (err) { console.log(err.stack) }
                                }
                            }
                        });
                    }
                    catch { }

                }
            }
        }
        catch { }
    }

    async pers_communication(page_pers, id) {
        try {
            let browser_orgs = await puppeteer.launch()
            let page_org = await browser_orgs.newPage()
            await page_pers.waitForSelector(`#connections`)
            let array_comm = []
            try {
                let count_type_comm = await page_pers.$$eval(`#connections > div > div > ul > li > ul > li`, (el) => el.length)
                for (let i = 1; i < count_type_comm + 1; i++) {
                    let li_type = await page_pers.$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i})`, (el) => el.innerText)
                    li_type = li_type.trim()
                    try {
                        let count_comm = await page_pers.$$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li`, (el) => el.length)
                        for (let j = 1; j < count_comm + 1; j++) {
                            let name_relative = await page_pers.$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a > span > span:nth-child(1)`, (el) => el.innerText)
                            let surname_relative = await page_pers.$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a > span > span:nth-child(2)`, (el) => el.innerText)
                            let patron_relative = await page_pers.$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a > span > span:nth-child(3)`, (el) => el.innerText)
                            let fullname = name_relative + " " + surname_relative + " " + patron_relative
                            let citiz_relative = await page_pers.$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > span`, (el) => el.title)
                            let company, post, ogrn, href_company
                            let exist_company = await page_pers.$$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a`, (el) => el.length)
                            if (exist_company > 1) {
                                try {
                                    let arr_href = []
                                    let arr_comp = []
                                    let arr_post = []

                                    arr_comp = await page_pers.$$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a`, (el) => el.map(elem => elem.innerText))
                                    arr_href = await page_pers.$$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a`, (el) => el.map(elem => elem.href))
                                    arr_post = await page_pers.$$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > span`, (el) => el.map(elem => elem.innerText))
                                    arr_href.forEach(function (el, index) {
                                        if (el.includes('/ru/company/'))
                                            company = arr_comp[index]
                                        href_company = arr_href[index]
                                        post = arr_post[1]
                                    })

                                    try {

                                        await page_org.goto(href_company, { timeout: 0 })
                                        await page_org.waitForSelector(`#profile-wrap`)
                                        let rows_count_comp = await page_org.$eval(`#personal > div > table`, (el) => el.rows.length)
                                        for (let ind = 1; ind < rows_count_comp + 1; ind++) {
                                            let box = await page_org.$eval(`#personal > div > table > tbody > tr:nth-child(${ind}) > td:nth-child(1)`, (el) => el.innerText)
                                            let value = await page_org.$eval(`#personal > div > table > tbody > tr:nth-child(${ind}) > td:nth-child(2)`, (el) => el.innerText)
                                            if (box == 'ОГРН') ogrn = Number(value)
                                            if (ogrn == undefined) ogrn = null
                                        }

                                    }
                                    catch { }
                                }
                                catch { }
                            }
                            else {
                                ogrn = null
                                post = null
                                company = null
                            }
                            let href_com = await page_pers.$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a`, (el) => el.href)
                            let href_del = '/person/'
                            let n_start = href_com.indexOf(href_del) + href_del.length
                            let id_com = href_com.substring(n_start)
                            let type
                            let kin, status_relative
                            try {
                                status_relative = await page_pers.$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j})`, (el) => el.innerText);

                                //arr_comp = await page_pers.$$eval(`#connections > div > div > ul > li > ul > li:nth-child(${i}) > ul > li:nth-child(${j}) > a`, (el) => el.map(elem => elem.innerText))

                                status_relative = status_relative.replace(/\n/g, "")
                                let stat_name = status_relative.indexOf(fullname) + fullname.length
                                status_relative = status_relative.substring(stat_name)
                                stat_name = status_relative.indexOf("–") + 1
                                status_relative = status_relative.substring(stat_name).trimStart()
                                status_relative = status_relative.substring(0, 75).trimEnd()
                                status_relative = status_relative.substring(0, status_relative.length - 1)
                            }
                            catch { }
                            if (li_type.includes('Члены семьи')) type = 'Член семьи'
                            else if (li_type.includes('Личные связи')) { type = 'Личная связь'; status_relative = null }
                            else if (li_type.includes('Деловые связи')) { type = 'Деловая связь'; status_relative = null }
                            let communication = {
                                id_pers: Number(id),
                                id_communication: id_com != undefined && id_com != "" ? Number(id_com) : j,
                                full_name: fullname,
                                citizenship: citiz_relative,
                                type_communication: type,
                                kinship: status_relative,
                                company_comm: company != undefined ? company : null,
                                post_comm: post != undefined ? post : null,
                                OGRN: ogrn
                            }
                            array_comm.push(communication)
                        }
                    }
                    catch { }
                }


            }
            catch { }
            this.communications = array_comm
            if (array_comm.length != 0) {
                for (let i = 0; i < array_comm.length; i++) {
                    const text_com_check = 'Select * from "Communication" where id_person = $1 and id_commun = $2'
                    const values_com_check = [this.id, this.communications[i].id_communication]
                    try {
                        await client.query(text_com_check, values_com_check, async (err, res) => {
                            if (err) {
                                console.log(err.stack)
                            } else {
                                if (res.rowCount == 0) {
                                    const text_comm = 'INSERT INTO "Communication"(id_person, id_commun, full_name, type_commun, citizenship, company, "OGRN", post, kinship) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);'
                                    const values_comm = [this.id, this.communications[i].id_communication, this.communications[i].full_name, this.communications[i].type_communication, this.communications[i].citizenship, this.communications[i].company_comm, this.communications[i].OGRN, this.communications[i].post_comm, this.communications[i].kinship]
                                    try {
                                        await client.query(text_comm, values_comm);
                                    }
                                    catch (err) { console.log(err.stack) }

                                }
                                else {
                                    const tetx_comm_upd = 'Update "Communication" set id_person=$1, id_commun=$2, full_name=$3, type_commun=$4, citizenship=$5, company=$6, "OGRN"=$7, post=$8, kinship=$9 where id_person = $1 and id_commun = $2'
                                    const values_comm_upd = [this.id, this.communications[i].id_communication, this.communications[i].full_name, this.communications[i].type_communication, this.communications[i].citizenship, this.communications[i].company_comm, this.communications[i].OGRN, this.communications[i].post_comm, this.communications[i].kinship]
                                    try {
                                        await client.query(tetx_comm_upd, values_comm_upd);
                                    }
                                    catch (err) { console.log(err.stack) }
                                }
                            }
                        });
                    }
                    catch { }

                }
            }
            await browser_orgs.close()
        }
        catch { }
    }

    async pers_entity(page_pers, id_pers) {
        try {
            let browser_ent = await puppeteer.launch()
            let page_org = await browser_ent.newPage()
            await page_pers.waitForSelector(`#related-companies`)
            let array_entity = []
            let li_count_ent = await page_pers.$$eval(`#related-companies > div.printWrap > #element > ul.timeline > li`, (el) => el.length) //#related-companies > div.printWrap > #element > ul.timeline > li
            for (let i = 1; i < li_count_ent + 1; i++) {
                let dates = await page_pers.$eval(`#related-companies > div.printWrap > #element > ul > li:nth-child(${i}) > div.tl-wrap > span`, (el) => el.innerText)
                dates = dates.split(/\n/)
                dates = dates.filter(function (el) { return el != '' })
                let date_start, date_end, organization, organization_href, post, inn, ogrn, fraction, country
                dates.forEach(function (element_c) {
                    if (String(element_c).includes('от'))
                        date_start = element_c
                    else if (String(element_c).includes('до'))
                        date_end = element_c
                    else {
                        date_end = null
                        date_start = null
                    }
                });

                organization = await page_pers.$eval(`#related-companies > div.printWrap > #element > ul > li:nth-child(${i}) > div.tl-wrap > div > div > a:nth-child(1) > span:nth-child(1)`, (el) => el.innerText)
                inn = await page_pers.$eval(`#related-companies > div.printWrap > #element > ul > li:nth-child(${i}) > div.tl-wrap > div > div > a:nth-child(1) > span:nth-child(2)`, (el) => el.innerText)
                organization_href = await page_pers.$eval(`#related-companies > div.printWrap > #element > ul > li:nth-child(${i}) > div.tl-wrap > div > div > a:nth-child(1)`, (el) => el.href)
                post = await page_pers.$eval(`#related-companies > div.printWrap > #element > ul > li:nth-child(${i}) > div.tl-wrap > div > div`, (el) => el.innerText)
                country = await page_pers.$eval(`#related-companies > div.printWrap > #element > ul > li:nth-child(${i}) > div.tl-wrap > div > div > span`, (el) => el.title)
                post = post.substring(organization.length + 8 + inn.length)
                post = post.charAt(0).toUpperCase() + post.slice(1)
                let arr_post = []
                arr_post = post.split(',')
                post = arr_post[0]
                if (arr_post.length > 1) fraction = arr_post[1].trim()
                else fraction = null
                try {

                    await page_org.goto(organization_href, { timeout: 0 })
                    await page_org.waitForSelector(`#profile-wrap`)
                    let rows_count_comp = await page_org.$eval(`#personal > div > table`, (el) => el.rows.length)
                    for (let i = 1; i < rows_count_comp + 1; i++) {
                        let box = await page_org.$eval(`#personal > div > table > tbody > tr:nth-child(${i}) > td:nth-child(1)`, (el) => el.innerText)
                        let value = await page_org.$eval(`#personal > div > table > tbody > tr:nth-child(${i}) > td:nth-child(2)`, (el) => el.innerText)
                        if (box == 'ОГРН') ogrn = Number(value)
                        if (ogrn == undefined) ogrn = null
                    }

                }
                catch { }


                let entity_obj = {
                    id_person: Number(id_pers),
                    date_start_ent: date_start != undefined ? date_start : null,
                    date_end_ent: date_end != undefined ? date_end : null,
                    name_organization: organization,
                    organization_post: post,
                    INN: Number(inn),
                    OGRN: ogrn,
                    fraction_org: fraction,
                    country_org: country
                }
                array_entity.push(entity_obj)
            }
            this.entity = array_entity
            if (array_entity.length != 0) {
                for (let i = 0; i < array_entity.length; i++) {
                    const text_ent_check = 'Select * from "Legal_entity" where id_person = $1 and "INN" = $2'
                    const values_ent_check = [this.id, this.entity[i].INN]
                    try {
                        await client.query(text_ent_check, values_ent_check, async (err, res) => {
                            if (err) {
                                console.log(err.stack)
                            } else {
                                if (res.rowCount == 0) {
                                    const text_ent = 'INSERT INTO "Legal_entity"(id_person, "OGRN", organization, "INN", post, country, date_start, date_end, fraction) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);'
                                    const values_ent = [this.id, this.entity[i].OGRN, this.entity[i].name_organization, this.entity[i].INN, this.entity[i].organization_post, this.entity[i].country_org, this.entity[i].date_start_ent, this.entity[i].date_end_ent, this.entity[i].fraction_org]
                                    try {
                                        await client.query(text_ent, values_ent);
                                    }
                                    catch (err) { console.log(err.stack) }

                                }
                                else {
                                    const tetx_ent_upd = 'Update "Legal_entity" set id_person=$1, "OGRN"=$2, organization=$3, "INN"=$4, post=$5, country=$6, date_start=$7, date_end=$8, fraction=$9 where id_person = $1 and "INN" = $4'
                                    const values_ent_upd = [this.id, this.entity[i].OGRN, this.entity[i].name_organization, this.entity[i].INN, this.entity[i].organization_post, this.entity[i].country_org, this.entity[i].date_start_ent, this.entity[i].date_end_ent, this.entity[i].fraction_org]
                                    try {
                                        await client.query(tetx_ent_upd, values_ent_upd);
                                    }
                                    catch (err) { console.log(err.stack) }
                                }
                            }
                        });
                    }
                    catch { }

                }
            }
            await browser_ent.close()
        }
        catch { }
    }
    async pers_ucrf(page_pers) {
        try {
            await page_pers.waitForSelector(`#reputation`)
            let array_uc = []
            try {
                const p_count = await page_pers.evaluate(() => {
                    let leng = document.querySelectorAll("#reputation > div > div > p").length;
                    return leng;
                });
                for (let i = 1; i < p_count + 1; i++) {
                    let href_uc = await page_pers.$eval(`#reputation > div > div > p:nth-child(${i}) > a`, (el) => el.href)
                    let sourse_uc = await page_pers.$eval(`#reputation > div > div > p:nth-child(${i})`, (el) => el.innerText)
                    let uc_obj = {
                        uc_href: href_uc,
                        uc_sourse: sourse_uc.replace(/\r?\n/g, "")
                    }
                    array_uc.push(uc_obj)
                }

            }
            catch { }
            this.uc = array_uc
            if (array_uc.length != 0) {
                for (let i = 0; i < array_uc.length; i++) {
                    const text_uc_check = 'Select * From "Reputation" where id_person = $1 and href_uc = $2'
                    const values_uc_check = [this.id, this.uc[i].uc_href]
                    try {
                        await client.query(text_uc_check, values_uc_check, async (err, res) => {
                            if (err) {
                                console.log(err.stack)
                            } else {
                                if (res.rowCount == 0) {
                                    const text_uc = 'INSERT INTO "Reputation"(id_person, href_uc, information_uc) VALUES ($1, $2, $3);'
                                    const values_uc = [this.id, this.uc[i].uc_href, this.uc[i].uc_sourse]
                                    try {
                                        await client.query(text_uc, values_uc);
                                    }
                                    catch (err) { console.log(err.stack) }

                                }
                                else {
                                    const tetx_uc_upd = 'Update "Reputation" set id_person=$1, href_uc=$2, information_uc=$3 where id_person = $1 and href_uc = $2'
                                    const values_uc_upd = [this.id, this.uc[i].uc_href, this.uc[i].uc_sourse]
                                    try {
                                        await client.query(tetx_uc_upd, values_uc_upd);
                                    }
                                    catch (err) { console.log(err.stack) }
                                }
                            }
                        });
                    }
                    catch { }

                }
            }
        }
        catch { }
    }
}

async function pars_href() {
    const browser = await puppeteer.launch()
    const page_pars = await browser.newPage()
    await page_pars.goto('https://rupep.org/ru/persons_list/', { timeout: 0 })
    let array = []
    await page_pars.waitForSelector(`#search-results > table`)
    let rows_count = await page_pars.$$eval(`#search-results > table > tbody > tr`, (el) => el.length)
    console.log(rows_count)
    for (let i = 1; i < rows_count+1;  i++){
        await page_pars.waitForSelector(`#search-results > table > tbody > tr:nth-child(${i})`)
        let href = await page_pars.$eval(`#search-results > table > tbody > tr:nth-child(${i}) > td:nth-child(1) > a`, (el) => el.href)
        array.push(href)
    }
    await browser.close()
    return array
}

process.on('warning', e => console.warn(e.stack));
async function pars() {
    let array_hrefs = []
    array_hrefs = await pars_href()
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    let counter = 0
    while (counter < array_hrefs.length) {
        await page.goto(array_hrefs[counter], { timeout: 0 })
        let href_del = '/person/'
        let n_start = array_hrefs[counter].indexOf(href_del) + href_del.length
        let id = array_hrefs[counter].substring(n_start)
        Number(id)
        let person = new Persons
        let arr_div = []
        let flag = 0;
        arr_div = await page.$$eval(`#profile > div`, (el) => el.map(elem => elem.id))
        let ness = 0
        await person.main_information(page, id)
        for (let it = 0; it < arr_div.length; it++) {
            switch (arr_div[it]) {
                case ('profile-wrap'): flag++; break
                case ('profile-wiki'): await person.pers_dossier(page); flag++; break;
                case ('reputation'): await person.pers_ucrf(page); flag++; break;
                case ('workbefore'): await person.pers_career(page, id); flag++; break;
                case ('declarations'): await person.pers_declare(page); flag++; break;
                case ('connections'): await person.pers_communication(page, id); flag++; break;
                case ('related-companies'): await person.pers_entity(page, id); flag++; break;
                default: console.log('Неизвестный раздел'); ness++; break;
            }
            if (flag == arr_div.length - ness) { counter++; console.log('Обработано: ' + counter + " из: " + array_hrefs.length); }
        }
    }
    await browser.close()
}

pars()
