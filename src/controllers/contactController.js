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
            // both email and phone match different contacts
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
            // else if(oldestContact.createdAt > newestContact.createdAt) {
            //     let temp = oldestContact;
            //     oldestContact = newestContact;
            //     newestContact = temp;
            //     primaryContact = oldestContact;
            //     await newestContact.update({ linkPrecedence: "secondary", linkedId: oldestContact.id });
            //     await Contact.update(
            //         { linkedId: oldestContact.id },
            //         { where: { linkedId: newestContact.id } } // re-point children
            //     );
            // }
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
    // else {
    //   // Case 2: Contacts exist
    //   // Find the oldest primary among them
    //   primaryContact = existingContacts.find(c => c.linkPrecedence === "primary");

    //   if (!primaryContact) {
    //     primaryContact = existingContacts[0];
    //     await primaryContact.update({ linkPrecedence: "primary" });
    //   }

    //   var sameEmailFound = false;
    //   var samePhoneFound = false;
    //   var sameEmailContact = null;
    //   var samePhoneContact = null;
    //   for(let contact of existingContacts) {
    //     if(contact.email === email && contact.phoneNumber !== phoneNumber) {
    //         sameEmailFound = true;
    //         sameEmailContact = contact;
    //     }
    //     if(contact.phoneNumber === phoneNumber && contact.email !== email) {
    //         samePhoneFound = true;
    //         samePhoneContact = contact;
    //     }
    //     if(contact.email === email && contact.phoneNumber === phoneNumber) {
    //         sameEmailFound = false;
    //         samePhoneFound = false;
    //         primaryContact = contact;
    //         break;
    //     }
    //   }

    //     if (sameEmailFound && samePhoneFound) {
    //         // pick primary correctly
    //         let oldestContact = sameEmailContact;
    //         let newestContact = samePhoneContact;

    //         if (samePhoneContact.createdAt < sameEmailContact.createdAt) {
    //             oldestContact = samePhoneContact;
    //             newestContact = sameEmailContact;
    //         }

    //         // ensure oldestContact is primary
    //         if (oldestContact.linkPrecedence !== "primary") {
    //             await oldestContact.update({ linkPrecedence: "primary", linkedId: null });
    //         }

    //         // update newest and ALL its children to point to oldest
    //         await newestContact.update({
    //             linkPrecedence: "secondary",
    //             linkedId: oldestContact.id
    //         });

    //         await Contact.update(
    //             { linkedId: oldestContact.id },
    //             { where: { linkedId: newestContact.id } } // re-point children
    //         );

    //         primaryContact = oldestContact;
    //     }
    //     else if(sameEmailFound || samePhoneFound){
    //         primaryContact = sameEmailFound ? sameEmailContact : samePhoneContact;

    //     }

    //   // If new info provided, create a secondary
    //   else{
    //         const isNewInfo = existingContacts.find(
    //         c => c.email !== email || c.phoneNumber !== phoneNumber
    //     );

    //     if (isNewInfo && !sameEmailFound && !samePhoneFound) {
    //         await Contact.create({
    //         email,
    //         phoneNumber,
    //         linkedId: primaryContact.id,
    //         linkPrecedence: "secondary"
    //         });
    //     }
    // }
      
    //   // if email is same as one of the contacts and the phone number is same as one of the other contacts, link them
      
    // }

    // Fetch all related contacts (primary + secondary)


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
