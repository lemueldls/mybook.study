import mailtrap as mt

# create mail object
mail = mt.Mail(
    sender=mt.Address(email="mailtrap@example.com", name="Mailtrap Test"),
    to=[mt.Address(email="your@email.com")],
    subject="You are awesome!",
    text="Congrats for sending test email with Mailtrap!",
)

# create client and send
client = mt.MailtrapClient(token="your-api-key")
client.send(mail)