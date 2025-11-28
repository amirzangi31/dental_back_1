import { users } from "../db/schema/users";

export const hasAccessToPage = async (userID: string, pageID: string) => {
  try {
    // if (userID === pageID) return true;

    // const page = await User.findOne({ _id: pageID });
    // if (!page.private) return true;

    // const followed = await Follow.findOne({
    //   follower: userID,
    //   following: pageID,
    // });
    // if (!followed) return false;

    // return true;
  } catch (err) {
    // Codes
  }
};
