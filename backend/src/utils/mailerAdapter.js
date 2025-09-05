const mailerAdapter = {};
const transporter = require('../connections/mailer');


mailerAdapter.sendMail = async ({to, template, headers}) => {
    const { subject, html, text } = template;
    return transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
        text,
        headers
    });
}

module.exports = mailerAdapter;
