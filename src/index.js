const PluginName = 'picgo-plugin-mmwiki'
const UploaderName = 'mmwiki'

const loginOption = ctx => {
    let userConfig = ctx.getConfig(`${PluginName}`)
    return {
        method: 'POST',
        url: `${userConfig.mmwiki}/author/login`, 
        form: {
            username: userConfig.username,
            password: userConfig.password
        },
        resolveWithFullResponse: true
    }
}

const uploadOption = (ctx, session, image) => {
    let userConfig = ctx.getConfig(`${PluginName}`)
    let ts = new Date().getTime()
    return {
        method: 'POST',
        url: `${userConfig.mmwiki}/image/upload?document_id=${userConfig.documentid}&guid=${ts}`,
        formData: {
            'editormd-image-file': {
                value: image.buffer,
                options: {
                    filename: image.fileName,
                    contentType: 'image/png'
                }
            }
        },
        headers: {
            Cookie: session.join('; ')
        },
        resolveWithFullResponse: true
    }
}

const login = async ctx => {
    const got = ctx.request
    let res = await got(loginOption(ctx))
    if (res.statusCode == 200) {
        let body = JSON.parse(res.body)
        ctx.log.info(body)
        if (body.code == 1) {
            ctx.log.info(res.headers)
            ctx.log.info(res.headers['set-cookie'])
            return Array.from(res.headers['set-cookie']).map(cookie => {
                ctx.log.info(cookie)
                if (cookie.indexOf(';') == -1) {
                    return ''
                }
                return cookie.split(';')[0]
            })
        }
    }
    return null
}

const doUpload = async (ctx, session) => {
    let userConfig = ctx.getConfig(`${PluginName}`)
    const got = ctx.request
    for (let i in ctx.output) {
        let res = await got(uploadOption(ctx, session, ctx.output[i]))
        if (res.statusCode == 200) {
            let body = JSON.parse(res.body)
            ctx.log.info(body)
            if (body.success == 1) {
                ctx.output[i].imgUrl = `${userConfig.mmwiki}${body.url}`
            }
        }
    }
    return ctx
}

const config = ctx => {
    let userConfig = ctx.getConfig(`${PluginName}`)
    if (!userConfig) {
        userConfig = {}
    }
    const prompts = [
        {
            name: 'mmwiki',
            type: 'input',
            default: userConfig.mmwiki || '',
            required: true
        },
        {
            name: 'username',
            type: 'input',
            default: userConfig.username || '',
            required: true
        },
        {
            name: 'password',
            type: 'input',
            default: userConfig.password || '',
            required: true
        },
        {
            name: 'documentid',
            type: 'input',
            default: userConfig.documentid || '151',
            required: true
        }
    ]
    return prompts
}

const handle = async ctx => {
    let session = await login(ctx)
    ctx = await doUpload(ctx, session)
    ctx.log.info(ctx)
    return ctx
}

module.exports = ctx => {
    const register = () => {
        ctx.helper.uploader.register(UploaderName, { handle })
    }

    return {
        register,
        config: config,
        uploader: UploaderName
    }
}
