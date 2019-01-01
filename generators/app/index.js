const Generator = require('yeoman-generator')
const os = require('os')
const path = require('path')
const parse = require('parse-git-config')
const shelljs = require('shelljs')

const now = new Date()
const date_year = now.getFullYear()

const git_config = parse.sync({path: `${os.homedir()}/.gitconfig`})
const git_username = (git_config.github || {}).user || os.userInfo().username
const git_full_name = git_config.user.name
const git_email = git_config.user.email


var input

module.exports = class extends Generator {

    prompting() {
        return this.prompt([{
            type: 'input',
            name: 'pkg',
            message: 'Your package name (no word-breaks)',
            default: path.basename(this.appname.replace(/ /g, '-'))  // defaults to current folder name
        }, {
            type: 'input',
            name: 'tagline',
            message: 'Your project tagline',
            default: 'Brief and fresh sentence fragment'
        }, {
            type: 'input',
            name: 'keywords',
            message: 'npm keywords'
        }, {
            type: 'list',
            name: 'license',
            message: 'License',
            choices: ["ISC", "SEE LICENSE IN <LICENSE>", "Apache-2.0",
                      "BSD-2-Clause", "BSD-3-Clause", "BSD-4-Clause",
                      "GPL-2.0-only", "GPL-2.0-or-later",
                      "GPL-3.0-only", "GPL-3.0-or-later"]
        }, {
            type: 'input',
            name: 'copyright_holder',
            message: 'Name of copyright holder',
            default: git_full_name,
            store: true
        }, {
            type: 'input',
            name: 'git_repository',
            message: 'Your hosted git repository (https)',
            default: `https://github.com/${git_username}/${this.appname.replace(/ /g, '-')}`
        }, {
            type: 'input',
            name: 'version',
            message: 'Initial project version',
            default: '0.0.1'
        }, {
            type: 'input',
            name: 'author',
            message: 'Your name',
            default: git_full_name
        }, {
            type: 'input',
            name: 'email',
            message: 'Your email address',
            default: git_email
        }]).then(answers => {
            input = answers
            input.keywords = answers.keywords.split(/\s+/)
            input.git_forge = answers.git_repository.match(/.*(@|:\/\/)(.*?)(:|\/).*?\/.*?$/)[2]
            input.git_group = answers.git_repository.match(/.*[@/].*[:/](.*?)\/.*?$/)[1]
            input.git_username = answers.git_repository.split('/').slice(-2)[0]
        })
    }


    createTypedocJs() {
        this.fs.copyTpl(
            this.templatePath('typedoc.js'),
            this.destinationPath('typedoc.js'),
            { pkg: input.pkg })
    }

    createGitIgnore() {
        this.fs.copyTpl(
            this.templatePath('.gitignore'),
            this.destinationPath('.gitignore'),
            {})
    }

    createLicense() {
        if (input.license === "SEE LICENSE IN <LICENSE>") {
            this.fs.copyTpl(
                this.templatePath('LICENSE'),
                this.destinationPath('LICENSE'),
                {
                    date_year: date_year,
                    copyright_holder: input.copyright_holder
                })
        }
    }

    createTsconfigJson() {
        this.fs.copyTpl(
            this.templatePath('tsconfig.json'),
            this.destinationPath('tsconfig.json'),
            {})
    }

    createGitForgeCIFile() {
        if (input.git_repository.includes('github.com')) {
            this.fs.copyTpl(
                this.templatePath('.travis.yml'),
                this.destinationPath('.travis.yml'),
                {})
        } else if (input.git_repository.includes('gitlab.com')) {
            this.fs.copyTpl(
                this.templatePath('.gitlab-ci.yml'),
                this.destinationPath('.gitlab-ci.yml'),
                {})
        }
    }

    createPackageJson() {
        this.fs.copyTpl(
            this.templatePath('package.json'),
            this.destinationPath('package.json'),
            {
                pkg: input.pkg,
                version: input.version,
                tagline: input.tagline,
                git_repository: input.git_repository,
                email: input.email,
                author: input.author,
                git_username: input.git_username,
                git_forge: input.git_forge,
                license: input.license
            })
    }

    extendPackageJson() {
        if (input.license === 'SEE LICENSE IN <LICENSE>') {
            let pkgJsonExtension =
            this.fs.extendJSON(this.destinationPath('package.json'), {
                private: true,
                scripts: {
                    install: "npm run build"
                }
            })
        }
        this.fs.extendJSON(this.destinationPath('package.json'), {
            keywords: input.keywords
        })
    }

    // FIXME: add badges to the readme
    createReadmeAbstract() {
        this.fs.copyTpl(
            this.templatePath('readme.md'),
            this.destinationPath('doc/readme.md'),
            {
                pkg: input.pkg,
                tagline: input.tagline,
                npm_install_from: input.license === 'SEE LICENSE IN <LICENSE>'
                    ? `git+ssh://git@${input.git_forge}/${input.git_group}/${input.pkg}`
                    : input.pkg
            })
    }

    createAggregatedReadmeHardlink() {
        shelljs.mkdir('-p', 'doc/typedoc')
        shelljs.touch('doc/typedoc/README.md')
        shelljs.exec('ln doc/typedoc/README.md')
    }

    createSrcTypescript() {
        this.fs.copyTpl(
            this.templatePath('src/src.ts'),
            this.destinationPath(`src/${input.pkg}.ts`),
            {
                date_year: date_year,
                copyright_holder: input.copyright_holder,
                tagline: input.tagline,
                pkg: input.pkg
            })
    }

    createTest() {
        this.fs.copyTpl(
            this.templatePath('test/test.ts'),
            this.destinationPath(`test/test-${input.pkg}.ts`),
            {
                pkg: input.pkg
            })
    }

    install() {
        if (shelljs.which('yarn')) {
            this.yarnInstall()
        } else {
            this.npmInstall()
        }
    }
}
