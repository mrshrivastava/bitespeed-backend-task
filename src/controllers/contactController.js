const Contact = require("../models/contact");
const { Op } = require("sequelize");

exports.identify = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    let sameContact = await Contact.findAll({
      where: {
        [Op.and]: [
          email ? { email } : null,
          phoneNumber ? { phoneNumber } : null
        ].filter(Boolean)
      }
    });

    // Step 1: Find existing contacts by email or phone
    let existingContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          email ? { email } : null,
          phoneNumber ? { phoneNumber } : null
        ].filter(Boolean)
      }
    });

    let primaryContact;

    // Case 1: Exact same contact exist, find the primary among them
    if(sameContact.length > 0) {
        if(sameContact[0].linkPrecedence === "primary") {
            primaryContact = sameContact[0];
        }
        else {
            primaryContact = await Contact.findOne({ where: { id: sameContact[0].linkedId } });
        }
    }

    else if (existingContacts.length === 0) {
      // Case 2: No contacts exist, create a new primary
      primaryContact = await Contact.create({
        email,
        phoneNumber,
        linkPrecedence: "primary"
      });
    } 
    else{

        let sameEmailContact = null;
        let samePhoneContact = null;
        for(let contact of existingContacts) {
            if(contact.email === email)
                sameEmailContact = contact;
            if(contact.phoneNumber === phoneNumber)
                samePhoneContact = contact;
        }
        if(sameEmailContact && samePhoneContact) {
            // case 3: both email and phone match different contacts
            let oldestContact = null;
            let newestContact = null;

            if(sameEmailContact.linkPrecedence === "primary")
                oldestContact = sameEmailContact;
            else {
                oldestContact = await Contact.findOne({ where: { id: sameEmailContact.linkedId } });
            }

            if(samePhoneContact.linkPrecedence === "primary")
                newestContact = samePhoneContact;
            else {
                newestContact = await Contact.findOne({ where: { id: samePhoneContact.linkedId } });
            }

            if(oldestContact.id === newestContact.id) {
                primaryContact = oldestContact;
            }
            else {

                if(oldestContact.createdAt > newestContact.createdAt) {
                    let temp = oldestContact;
                    oldestContact = newestContact;
                    newestContact = temp;
                }
                primaryContact = oldestContact;
                await newestContact.update({ linkPrecedence: "secondary", linkedId: oldestContact.id });
                await Contact.update(
                    { linkedId: oldestContact.id },
                    { where: { linkedId: newestContact.id } } // re-point children
                );
            }
        }
        else if(sameEmailContact || samePhoneContact) {
            // case 4: either email or phone matches
            
            primaryContact = sameEmailContact ? sameEmailContact : samePhoneContact;
            if(primaryContact.linkPrecedence === "secondary") {
                primaryContact = await Contact.findOne({ where: { id: primaryContact.linkedId } });
            }
            await Contact.create({
            email,
            phoneNumber,
            linkedId: primaryContact.id,
            linkPrecedence: "secondary"
            });
        }
    }

    const allContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id }
        ]
      }
    });

    // Consolidate response
    const emails = [
      ...new Set(allContacts.map(c => c.email).filter(Boolean))
    ];
    const phoneNumbers = [
      ...new Set(allContacts.map(c => c.phoneNumber).filter(Boolean))
    ];
    const secondaryContactIds = allContacts
      .filter(c => c.linkPrecedence === "secondary")
      .map(c => c.id);

    return res.status(200).json({
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
