import { describe, expect, it } from "vitest";
import type { OutputChannel } from "./entities.js";
import {
  buildAllOutputs,
  buildContributorsHtml,
  buildHeadlineFragment,
  buildHtmlFragment,
  buildLinkedHtml,
  buildPlainTextFragment,
  buildTextFragment,
  type EpisodeForOutput,
  type PlaylistEntryForOutput,
} from "./playlist-output.js";

const episode: EpisodeForOutput = { number: 821, suffix: "", headline: "Crispy variations" };

function entry(overrides: Partial<PlaylistEntryForOutput["track"]> = {}, position = 0): PlaylistEntryForOutput {
  return {
    position,
    track: {
      title: "Track",
      album: { title: "Album", link: null },
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
    const entries = [entry({ title: "One" }, 0), entry({ title: "Two" }, 1)];
    expect(buildTextFragment(entries, bluesky)).toBe("Artist A, Artist A");
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
    const suffixedEpisode: EpisodeForOutput = { number: 103, suffix: "v1", headline: "Test" };
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
