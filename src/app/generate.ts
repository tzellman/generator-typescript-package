import Generator from 'yeoman-generator'
import D from 'od'
import camelCase from 'camelcase'
import { now } from '../date'
import { UserInput } from './user-input'

export type Path = string;


export function generator(
    generator: Generator,
    userInput: UserInput
): (template: Path, destination?: Path) => void {

    return function generate(
        template: Path,
        destination?: Path
    ) {

        if (destination === undefined) {
            destination = generatedFileName(template)
        }

        generator.fs.copyTpl(
            generator.templatePath(template),
            generator.destinationPath(destination),
            {
                ...userInput,

                dateYear: D.get('year', now()),

                exportStatement: generator.options.default
                    ? 'export default'
                    : 'export',
                importStatement: generator.options.default
                    ? camelCase(userInput.packageNameKebabCase)
                    : ['{', camelCase(userInput.packageNameKebabCase), '}'].join(' '),

                // TODO: fix this archaic nonsense for the gitlab case
                npm_install_from: userInput.license === 'SEE LICENSE IN <LICENSE>'
                    ? `git+ssh://git@${userInput.gitHost}/${userInput.gitGroup}/${userInput.packageNameKebabCase}`
                    : userInput.scopedPackageName
            }
        )
    }
}

export function generatedFileName(templateFileName: string): string {

    return templateFileName
        .replace(/^.*\//, '')
        .replace(/_dot_/g, '.')
        .replace(/dot_/g, '.')
}
