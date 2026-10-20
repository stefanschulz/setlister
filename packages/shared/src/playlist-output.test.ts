import { describe, expect, it } from "vitest";
import type { OutputChannel } from "./entities.js";
import {
  buildAllOutputs,
  buildContributorsHtml,
  buildHeadlineFragment,
  buildHtmlFragment,
  buildIntroFragment,
  buildLabelsFragment,
  buildLinkedHtml,
  buildPlainTextFragment,
  buildTextFragment,
  buildTracklistJson,
  type EpisodeForOutput,
  type PlaylistEntryForOutput,
} from "./playlist-output.js";

const episode: EpisodeForOutput = {
  number: 821,
  suffix: "",
  headline: "Crispy variations",
  teaser: null,
  script: null,
};

function entry(overrides: Partial<PlaylistEntryForOutput["track"]> = {}, position = 0): PlaylistEntryForOutput {
  return {
    position,
    track: {
      title: "Track",
      album: { title: "Album", link: null, label: null },
      contributors: [
        {
          role: "ORIGINAL",
          position: 0,
          artist: { name: "Artist A", websiteUrl: null, socialReferences: [] },
        },
      ],
      ...overrides,
    },
  };
}

describe("buildHtmlFragment", () => {
  it("renders the <Künstler°> - <Track> (<Album>) format as a list", () => {
    const html = buildHtmlFragment([entry()]);
    expect(html).toContain("<li>Artist A - Track (Album)</li>");
    expect(html).toMatch(/^<ul>[\s\S]*<\/ul>$/);
  });

  it("links the artist name when a website URL is present", () => {
    const html = buildHtmlFragment([
      entry({
        contributors: [
          {
            role: "ORIGINAL",
            position: 0,
            artist: { name: "Artist A", websiteUrl: "https://a.example", socialReferences: [] },
          },
        ],
      }),
    ]);
    expect(html).toContain('<a href="https://a.example">Artist A</a> - Track (Album)');
  });

  it("links the album title when a link is present", () => {
    const html = buildHtmlFragment([entry({ album: { title: "Album", link: "https://label.example" } })]);
    expect(html).toContain('(<a href="https://label.example">Album</a>)');
  });

  it("escapes HTML-significant characters in names", () => {
    const html = buildHtmlFragment([
      entry({
        title: 'Track <script>alert("x")</script>',
        contributors: [
          {
            role: "ORIGINAL",
            position: 0,
            artist: { name: "A & B", websiteUrl: null, socialReferences: [] },
          },
        ],
      }),
    ]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("A &amp; B");
    expect(html).toContain("&lt;script&gt;");
  });

  it("respects position order regardless of input order", () => {
    const html = buildHtmlFragment([entry({ title: "Second" }, 1), entry({ title: "First" }, 0)]);
    const firstIndex = html.indexOf("First");
    const secondIndex = html.indexOf("Second");
    expect(firstIndex).toBeGreaterThan(-1);
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  it("applies the Original/Feat./Remix formatting rule from M2 to multiple contributors", () => {
    const html = buildHtmlFragment([
      entry({
        contributors: [
          { role: "ORIGINAL", position: 0, artist: { name: "A", websiteUrl: null, socialReferences: [] } },
          { role: "REMIX", position: 0, artist: { name: "B", websiteUrl: null, socialReferences: [] } },
        ],
      }),
    ]);
    expect(html).toContain("A vs B - Track (Album)");
  });
});

describe("buildTracklistJson", () => {
  // Mirrors the two tracks of docs/tracklist-import-example.json.
  const aurory = entry(
    {
      title: "Yeah Oh",
      album: { title: "Yeah Oh", link: "https://open.spotify.com/intl-de/album/5xPkkRl7NClQOsNgIdASke", label: null },
      contributors: [
        {
          role: "ORIGINAL",
          position: 0,
          artist: { name: "Aurory", websiteUrl: "https://soundcloud.com/aurory", socialReferences: [] },
        },
      ],
    },
    0,
  );
  const grabSociety = entry(
    {
      title: "Reincarnation (Glare devoxed)",
      album: {
        title: "Reincarnation (Remixed)",
        link: "https://thegrabsociety.bandcamp.com/album/reincarnation-remixed",
        label: { id: 1, name: "EchoZone", facebookReferenceName: null },
      },
      contributors: [
        {
          role: "REMIX",
          position: 0,
          artist: { name: "Talking to Ghosts", websiteUrl: "https://soundcloud.com/talkingtoghosts", socialReferences: [] },
        },
        {
          role: "ORIGINAL",
          position: 0,
          artist: { name: "The Grab Society", websiteUrl: "https://www.manfredthomaser.de/#TheGrabSociety", socialReferences: [] },
        },
      ],
    },
    1,
  );

  it("produces the format of the example import file", () => {
    const parsed = JSON.parse(buildTracklistJson([aurory, grabSociety]));
    expect(parsed).toEqual({
      version: 1,
      tracks: [
        {
          artists: [{ name: "Aurory", role: "original", url: "https://soundcloud.com/aurory" }],
          title: "Yeah Oh",
          album: "Yeah Oh",
          albumUrl: "https://open.spotify.com/intl-de/album/5xPkkRl7NClQOsNgIdASke",
          label: "",
        },
        {
          artists: [
            { name: "The Grab Society", role: "original", url: "https://www.manfredthomaser.de/#TheGrabSociety" },
            { name: "Talking to Ghosts", role: "remix", url: "https://soundcloud.com/talkingtoghosts" },
          ],
          title: "Reincarnation (Glare devoxed)",
          album: "Reincarnation (Remixed)",
          albumUrl: "https://thegrabsociety.bandcamp.com/album/reincarnation-remixed",
          label: "EchoZone",
        },
      ],
    });
  });

  it("emits keys in the documented order, version first", () => {
    const parsed = JSON.parse(buildTracklistJson([aurory]));
    expect(Object.keys(parsed)).toEqual(["version", "tracks"]);
    expect(Object.keys(parsed.tracks[0])).toEqual(["artists", "title", "album", "albumUrl", "label"]);
    expect(Object.keys(parsed.tracks[0].artists[0])).toEqual(["name", "role", "url"]);
  });

  it("omits url and albumUrl when there is no link, but always writes label", () => {
    const parsed = JSON.parse(buildTracklistJson([entry()]));
    expect(parsed.tracks[0]).toEqual({
      artists: [{ name: "Artist A", role: "original" }],
      title: "Track",
      album: "Album",
      label: "",
    });
  });

  it("orders artists original, featuring, remix, each by position", () => {
    const contributor = (name: string, role: "ORIGINAL" | "FEATURING" | "REMIX", position: number) => ({
      role,
      position,
      artist: { name, websiteUrl: null, socialReferences: [] },
    });
    const parsed = JSON.parse(
      buildTracklistJson([
        entry({
          contributors: [
            contributor("Remixer", "REMIX", 0),
            contributor("Guest", "FEATURING", 0),
            contributor("B", "ORIGINAL", 1),
            contributor("A", "ORIGINAL", 0),
          ],
        }),
      ]),
    );
    expect(parsed.tracks[0].artists.map((a: { name: string; role: string }) => `${a.name}:${a.role}`)).toEqual([
      "A:original",
      "B:original",
      "Guest:featuring",
      "Remixer:remix",
    ]);
  });

  it("sorts tracks by position", () => {
    const parsed = JSON.parse(buildTracklistJson([entry({ title: "Second" }, 1), entry({ title: "First" }, 0)]));
    expect(parsed.tracks.map((t: { title: string }) => t.title)).toEqual(["First", "Second"]);
  });

  it("returns an empty tracks list for an empty playlist", () => {
    expect(JSON.parse(buildTracklistJson([]))).toEqual({ version: 1, tracks: [] });
  });

  it("round-trips special characters through JSON", () => {
    const parsed = JSON.parse(buildTracklistJson([entry({ title: 'Say "Hi" & <b>' })]));
    expect(parsed.tracks[0].title).toBe('Say "Hi" & <b>');
  });
});

describe("buildPlainTextFragment", () => {
  it("renders the same <Künstler> - <Track> (<Album>) listing as HTML, but as plain lines with no tags/links", () => {
    const text = buildPlainTextFragment([entry()]);
    expect(text).toBe("Artist A - Track (Album)");
  });

  it("joins multiple entries with newlines, respecting position order", () => {
    const text = buildPlainTextFragment([entry({ title: "Second" }, 1), entry({ title: "First" }, 0)]);
    expect(text).toBe("Artist A - First (Album)\nArtist A - Second (Album)");
  });

  it("never includes a link even when the artist/album has one", () => {
    const text = buildPlainTextFragment([
      entry({
        album: { title: "Album", link: "https://label.example" },
        contributors: [
          { role: "ORIGINAL", position: 0, artist: { name: "Artist A", websiteUrl: "https://a.example", socialReferences: [] } },
        ],
      }),
    ]);
    expect(text).toBe("Artist A - Track (Album)");
    expect(text).not.toContain("http");
  });
});

describe("buildTextFragment", () => {
  const facebook: OutputChannel = {
    id: 1,
    name: "Facebook",
    pattern: "{artists} ({album})",
    headlinePattern: "{headline} at episode {episode} having {artists}",
  };
  const bluesky: OutputChannel = {
    id: 2,
    name: "Bluesky",
    pattern: "{artists}",
    headlinePattern: "Episode {episode} having {artists}",
  };

  const artistWithRefs = {
    name: "Artist A",
    websiteUrl: null,
    socialReferences: [
      { channelId: facebook.id, referenceName: "@a.fb" },
      { channelId: bluesky.id, referenceName: "@a.bsky" },
    ],
  };

  it("applies the channel's pattern, substituting the matching channel reference", () => {
    const entries = [entry({ contributors: [{ role: "ORIGINAL", position: 0, artist: artistWithRefs }] })];
    expect(buildTextFragment(entries, facebook)).toBe("@a.fb (Album)");
  });

  it("a pattern without {album} omits it", () => {
    const entries = [entry({ contributors: [{ role: "ORIGINAL", position: 0, artist: artistWithRefs }] })];
    expect(buildTextFragment(entries, bluesky)).toBe("@a.bsky");
  });

  it("falls back to the plain artist name when no reference exists for the channel", () => {
    const otherChannel: OutputChannel = {
      id: 999,
      name: "Threads",
      pattern: "{artists}",
      headlinePattern: "Episode {episode} having {artists}",
    };
    const entries = [entry({ contributors: [{ role: "ORIGINAL", position: 0, artist: artistWithRefs }] })];
    expect(buildTextFragment(entries, otherChannel)).toBe("Artist A");
  });

  it("prefixes a reference name with @ if it wasn't entered with one", () => {
    const artist = {
      name: "Artist A",
      websiteUrl: null,
      socialReferences: [{ channelId: bluesky.id, referenceName: "artist.a.official" }],
    };
    const entries = [entry({ contributors: [{ role: "ORIGINAL", position: 0, artist }] })];
    expect(buildTextFragment(entries, bluesky)).toBe("@artist.a.official");
  });

  it("doesn't double up the @ if the reference name already has one", () => {
    const entries = [entry({ contributors: [{ role: "ORIGINAL", position: 0, artist: artistWithRefs }] })];
    expect(buildTextFragment(entries, bluesky)).toBe("@a.bsky");
  });

  it("joins multiple playlist entries with a comma", () => {
    const entries = [
      entry({ title: "One", contributors: [{ role: "ORIGINAL", position: 0, artist: artistWithRefs }] }, 0),
      entry({ title: "Two" }, 1),
    ];
    expect(buildTextFragment(entries, bluesky)).toBe("@a.bsky, Artist A");
  });

  it("dedupes entries that render identically for a pattern without {track} (e.g. same artist twice)", () => {
    const entries = [entry({ title: "One" }, 0), entry({ title: "Two" }, 1)];
    expect(buildTextFragment(entries, bluesky)).toBe("Artist A");
  });

  it("dedupes entries that render identically for a pattern without {track} (e.g. same artist/album from different tracks)", () => {
    const entries = [entry({ title: "One" }, 0), entry({ title: "Two" }, 1)];
    expect(buildTextFragment(entries, facebook)).toBe("Artist A (Album)");
  });

  it("keeps entries that render differently (different album)", () => {
    const entries = [
      entry({ title: "One" }, 0),
      entry({ title: "Two", album: { title: "Other Album", link: null } }, 1),
    ];
    expect(buildTextFragment(entries, facebook)).toBe("Artist A (Album), Artist A (Other Album)");
  });
});

describe("buildAllOutputs", () => {
  it("bundles the HTML fragment and every given channel's text and headlineText, keyed by channel id", () => {
    const facebook: OutputChannel = {
      id: 1,
      name: "Facebook",
      pattern: "{artists} ({album})",
      headlinePattern: "{headline} at episode {episode} having {artists}",
    };
    const threads: OutputChannel = {
      id: 2,
      name: "Threads",
      pattern: "{artists}",
      headlinePattern: "Episode {episode} having {artists}",
    };

    const result = buildAllOutputs([entry()], [facebook, threads], episode);
    expect(result.html).toContain("<li>Artist A - Track (Album)</li>");
    expect(result.plainText).toBe("Artist A - Track (Album)");
    expect(Object.keys(result.text).sort()).toEqual([String(facebook.id), String(threads.id)].sort());
    expect(result.text[facebook.id]).toBe("Artist A (Album)");
    expect(result.text[threads.id]).toBe("Artist A");
    expect(result.headlineText[facebook.id]).toBe(
      "Crispy variations at episode 821 having Artist A (Album)",
    );
    expect(result.headlineText[threads.id]).toBe("Episode 821 having Artist A");
    expect(JSON.parse(result.tracklistJson).tracks).toHaveLength(1);
    expect(result.labelsText).toBe("");
    expect(result.introText).toBe("Artist A (Album)");
    expect(result.scriptText).toBe("");
  });

  it("includes labelsText", () => {
    const entries = [
      entry({ album: { title: "Album", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: "label.a" } } }),
    ];
    expect(buildAllOutputs(entries, [], episode).labelsText).toBe("+++\n@label.a\n+++");
  });

  it("includes introText (teaser + list) and scriptText, from the episode's teaser/script", () => {
    const episodeWithNotes: EpisodeForOutput = { ...episode, teaser: "Teaser note", script: "Script note" };
    const result = buildAllOutputs([entry()], [], episodeWithNotes);
    expect(result.introText).toBe("Teaser note\n\nArtist A (Album)");
    expect(result.scriptText).toBe("Script note");
  });
});

describe("buildHeadlineFragment", () => {
  it("substitutes {headline}, {episode} (incl. suffix), and {artists}", () => {
    const channel: OutputChannel = {
      id: 1,
      name: "Facebook",
      pattern: "{artists}",
      headlinePattern: "{headline} at episode {episode} having {artists}",
    };
    const suffixedEpisode: EpisodeForOutput = {
      number: 103,
      suffix: "v1",
      headline: "Test",
      teaser: null,
      script: null,
    };
    expect(buildHeadlineFragment("Artist A, Artist B", suffixedEpisode, channel)).toBe(
      "Test at episode 103v1 having Artist A, Artist B",
    );
  });
});

describe("buildContributorsHtml", () => {
  it("links each contributor individually, applying the Original/Feat./Remix format", () => {
    const html = buildContributorsHtml([
      { role: "ORIGINAL", position: 0, artist: { name: "A", websiteUrl: "https://a.example", socialReferences: [] } },
      { role: "FEATURING", position: 0, artist: { name: "B", websiteUrl: null, socialReferences: [] } },
    ]);
    expect(html).toBe('<a href="https://a.example">A</a> feat. B');
  });

  it("escapes HTML-significant characters in names", () => {
    const html = buildContributorsHtml([
      { role: "ORIGINAL", position: 0, artist: { name: "A & B", websiteUrl: null, socialReferences: [] } },
    ]);
    expect(html).toBe("A &amp; B");
  });
});

describe("buildIntroFragment", () => {
  it("returns just the artist/album list when there's no teaser", () => {
    expect(buildIntroFragment([entry()], "")).toBe("Artist A (Album)");
  });

  it("returns just the (trimmed) teaser when there are no playlist entries", () => {
    expect(buildIntroFragment([], "  Teaser note  ")).toBe("Teaser note");
  });

  it("joins teaser and list with a blank line when both are present", () => {
    expect(buildIntroFragment([entry()], "Teaser note")).toBe("Teaser note\n\nArtist A (Album)");
  });

  it("returns an empty string when there's neither a teaser nor any playlist entries", () => {
    expect(buildIntroFragment([], "")).toBe("");
  });

  it("uses the artist's plain name, not a channel reference name (not tied to any one channel)", () => {
    const entries = [
      entry({
        contributors: [
          {
            role: "ORIGINAL",
            position: 0,
            artist: {
              name: "Artist A",
              websiteUrl: null,
              socialReferences: [{ channelId: 1, referenceName: "@artist-a" }],
            },
          },
        ],
      }),
    ];
    expect(buildIntroFragment(entries, "")).toBe("Artist A (Album)");
  });

  it("dedupes identical artist/album entries, same as the retired Teaser channel's pattern did", () => {
    const entries = [entry({ title: "One" }, 0), entry({ title: "Two" }, 1)];
    expect(buildIntroFragment(entries, "")).toBe("Artist A (Album)");
  });
});

describe("buildLabelsFragment", () => {
  it("returns an empty string when no track's album has a label", () => {
    expect(buildLabelsFragment([entry()])).toBe("");
  });

  it("returns an empty string when the label has no Facebook reference name", () => {
    const entries = [entry({ album: { title: "Album", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: null } } })];
    expect(buildLabelsFragment(entries)).toBe("");
  });

  it("wraps a single label's Facebook reference name in +++ lines, @-prefixed", () => {
    const entries = [
      entry({ album: { title: "Album", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: "label.a" } } }),
    ];
    expect(buildLabelsFragment(entries)).toBe("+++\n@label.a\n+++");
  });

  it("doesn't double up the @ if the reference name already has one", () => {
    const entries = [
      entry({ album: { title: "Album", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: "@label.a" } } }),
    ];
    expect(buildLabelsFragment(entries)).toBe("+++\n@label.a\n+++");
  });

  it("separates multiple distinct labels with +++", () => {
    const entries = [
      entry(
        { album: { title: "Album A", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: "label.a" } } },
        0,
      ),
      entry(
        { album: { title: "Album B", link: null, label: { id: 2, name: "Label 2", facebookReferenceName: "label.b" } } },
        1,
      ),
    ];
    expect(buildLabelsFragment(entries)).toBe("+++\n@label.a\n+++\n@label.b\n+++");
  });

  it("dedupes the same label (by id) across multiple tracks", () => {
    const entries = [
      entry(
        { title: "Track One", album: { title: "Album A", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: "label.a" } } },
        0,
      ),
      entry(
        { title: "Track Two", album: { title: "Album A", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: "label.a" } } },
        1,
      ),
    ];
    expect(buildLabelsFragment(entries)).toBe("+++\n@label.a\n+++");
  });

  it("skips labels without a Facebook reference name but keeps others", () => {
    const entries = [
      entry(
        { album: { title: "Album A", link: null, label: { id: 1, name: "Label 1", facebookReferenceName: null } } },
        0,
      ),
      entry(
        { album: { title: "Album B", link: null, label: { id: 2, name: "Label 2", facebookReferenceName: "label.b" } } },
        1,
      ),
    ];
    expect(buildLabelsFragment(entries)).toBe("+++\n@label.b\n+++");
  });
});

describe("buildLinkedHtml", () => {
  it("wraps the text in a link when a URL is given", () => {
    expect(buildLinkedHtml("Album", "https://label.example")).toBe(
      '<a href="https://label.example">Album</a>',
    );
  });

  it("returns escaped plain text when no URL is given", () => {
    expect(buildLinkedHtml("A & B", null)).toBe("A &amp; B");
  });
});
